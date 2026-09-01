import type { SupabaseClient } from '@supabase/supabase-js';
import { type UserSettings } from './openai';
import { escreverCarrossel, temIA } from './ia';
import { contextoDaMemoria } from './memoria';
import { contextoDoMaterial } from './material';
import { splitIntoSlides } from './split';
import { renderSlidePng, toDataUri, defaultSpec } from './render';
import { designParaSpec, ehDesignDoEditor } from './design-para-spec';
import { downloadBuffer, uploadBuffer, userPath } from './storage';
import { fontesDoUtilizador } from './fontes-do-utilizador';
import * as canva from './canva';
import { encrypt } from './crypto';
import type { TemplateSpec } from './types';

/**
 * O motor da fábrica. Cada carrossel passa por dois trabalhos:
 *   write  → texto slide a slide
 * As fotografias não se geram: vêm da biblioteca, carregadas por ti.
 *   render → PNGs finais (motor local) ou design no Canva (motor canva)
 */

export async function getSettings(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserSettings> {
  const { data } = await supabase
    .from('settings')
    .select('openai_key_enc, text_model, render_engine, brand_voice, perfil')
    .eq('user_id', userId)
    .maybeSingle();

  return {
    openai_key_enc: data?.openai_key_enc ?? null,
    text_model: data?.text_model ?? process.env.AI_TEXT_MODEL ?? '',
    render_engine: (data?.render_engine ?? 'local') as 'local' | 'canva',
    brand_voice: data?.brand_voice ?? null,
    perfil: data?.perfil ?? null,
  };
}

/**
 * O `spec` guardado pode ser um desenho do editor. Converte-o para o formato
 * que o motor sabe compor.
 */
function especDe(template: { spec?: unknown } | null | undefined): TemplateSpec {
  const guardado = template?.spec;
  if (!guardado) return defaultSpec();
  if (ehDesignDoEditor(guardado)) return designParaSpec(guardado);
  return guardado as TemplateSpec;
}

async function getTemplate(supabase: SupabaseClient, templateId: string | null, userId: string) {
  if (templateId) {
    const { data } = await supabase
      .from('templates')
      .select('*')
      .eq('id', templateId)
      .maybeSingle();
    if (data) return data;
  }
  const { data } = await supabase
    .from('templates')
    .select('*')
    .eq('user_id', userId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  return data;
}

export interface JobRow {
  id: string;
  user_id: string;
  batch_id: string | null;
  carousel_id: string | null;
  type: 'write' | 'render' | 'canva' | 'image';
  payload: Record<string, unknown>;
  attempts: number;
}

// ── 1. Escrever ──────────────────────────────────────────────
export async function runWrite(supabase: SupabaseClient, job: JobRow) {
  const carouselId = job.carousel_id!;
  const { data: carousel } = await supabase
    .from('carousels')
    .select('*')
    .eq('id', carouselId)
    .single();
  if (!carousel) throw new Error('Carrossel não encontrado.');

  await supabase.from('carousels').update({ status: 'writing' }).eq('id', carouselId);

  const settings = await getSettings(supabase, job.user_id);
  const template = await getTemplate(supabase, carousel.template_id, job.user_id);
  const spec: TemplateSpec = especDe(template);
  const slidesPer = Number(job.payload.slides_per ?? 7);

  let sourceText: string | null = null;
  if (typeof job.payload.source_text === 'string') {
    sourceText = job.payload.source_text;
  } else if (carousel.source_id) {
    const { data: src } = await supabase
      .from('sources')
      .select('content')
      .eq('id', carousel.source_id)
      .maybeSingle();
    sourceText = src?.content ?? null;
  }

  // 'texto' = repartir o material carregado, sem IA. 'ia' = escrever com a OpenAI.
  // Sem modo escolhido, decide a existência (ou não) de chave.
  const modo =
    job.payload.mode === 'texto' || job.payload.mode === 'ia'
      ? (job.payload.mode as 'texto' | 'ia')
      : temIA(settings)
        ? 'ia'
        : 'texto';

  const content =
    modo === 'texto'
      ? splitIntoSlides({
          text:
            sourceText ??
            (typeof job.payload.topic === 'string' ? job.payload.topic : '') ??
            carousel.topic ??
            '',
          spec,
          slidesPer,
          title: carousel.title,
        })
      : await escreverCarrossel({
          settings,
          spec,
          slidesPer,
          topic: carousel.topic ?? (job.payload.topic as string | undefined) ?? null,
          sourceText,
          // as regras dela e o que a Cát.IA aprendeu andam com o pedido
          extra: [
            await contextoDaMemoria(supabase, job.user_id),
            (job.payload.extra as string | undefined) ?? null,
          ]
            .filter(Boolean)
            .join('\n\n') || null,
          // o que ela carregou em Material entra como matéria-prima: os casos
          // dela valem mais do que qualquer coisa que o modelo invente
          material: await contextoDoMaterial(
            supabase,
            job.user_id,
            [carousel.topic, job.payload.topic, job.payload.extra]
              .filter((x): x is string => typeof x === 'string')
              .join(' '),
            sourceText ? 6_000 : 14_000,
          ),
        });

  await supabase.from('slides').delete().eq('carousel_id', carouselId);
  await supabase.from('slides').insert(
    content.slides.map((s) => ({
      carousel_id: carouselId,
      idx: s.idx,
      fields: s.fields,
    })),
  );

  await supabase
    .from('carousels')
    .update({
      title: content.title || carousel.title,
      topic: content.topic || carousel.topic,
      caption: content.caption,
      hashtags: content.hashtags,
      updated_at: new Date().toISOString(),
    })
    .eq('id', carouselId);

  // encadeia o trabalho seguinte: compor os PNGs.
  await supabase.from('jobs').insert({
    user_id: job.user_id,
    batch_id: job.batch_id,
    carousel_id: carouselId,
    type: settings.render_engine === 'canva' ? 'canva' : 'render',
    payload: job.payload,
  });
}

// ── 2a. Render local ─────────────────────────────────────────
export async function runRender(supabase: SupabaseClient, job: JobRow) {
  const carouselId = job.carousel_id!;
  await supabase.from('carousels').update({ status: 'rendering' }).eq('id', carouselId);

  const { data: carousel } = await supabase
    .from('carousels')
    .select('*')
    .eq('id', carouselId)
    .single();
  if (!carousel) throw new Error('Carrossel não encontrado.');

  const template = await getTemplate(supabase, carousel.template_id, job.user_id);
  const spec: TemplateSpec = especDe(template);

  let photoUri: string | null = null;
  if (carousel.photo_id) {
    const { data: photo } = await supabase
      .from('photos')
      .select('storage_path')
      .eq('id', carousel.photo_id)
      .maybeSingle();
    if (photo?.storage_path) {
      photoUri = toDataUri(await downloadBuffer(supabase, photo.storage_path));
    }
  }

  let frameUri: string | null = null;
  if (template?.bg_path) {
    frameUri = toDataUri(await downloadBuffer(supabase, template.bg_path));
  }

  const { data: slides } = await supabase
    .from('slides')
    .select('*')
    .eq('carousel_id', carouselId)
    .order('idx');

  const total = slides?.length ?? 0;
  const fontesExtra = await fontesDoUtilizador(supabase, job.user_id);

  for (const slide of slides ?? []) {
    const png = await renderSlidePng({
      fontesExtra,
      spec,
      fields: slide.fields as Record<string, string>,
      idx: slide.idx,
      total,
      photoUri,
      frameUri,
    });
    const path = userPath(job.user_id, 'renders', carouselId, `${String(slide.idx + 1).padStart(2, '0')}.png`);
    await uploadBuffer(supabase, path, png);
    await supabase.from('slides').update({ render_path: path }).eq('id', slide.id);
  }

  await supabase
    .from('carousels')
    .update({ status: 'ready', error: null, updated_at: new Date().toISOString() })
    .eq('id', carouselId);
}

// ── 2b. Canva autofill + export ──────────────────────────────
export async function runCanva(supabase: SupabaseClient, job: JobRow) {
  const carouselId = job.carousel_id!;
  await supabase.from('carousels').update({ status: 'rendering' }).eq('id', carouselId);

  const { data: integration } = await supabase
    .from('integrations')
    .select('*')
    .eq('user_id', job.user_id)
    .eq('provider', 'canva')
    .maybeSingle();
  if (!integration) throw new Error('Canva não está ligado. Liga em Definições.');

  const token = await canva.validAccessToken(integration, async (patch) => {
    await supabase.from('integrations').update(patch).eq('id', integration.id);
  });

  const { data: carousel } = await supabase
    .from('carousels')
    .select('*')
    .eq('id', carouselId)
    .single();
  const template = await getTemplate(supabase, carousel!.template_id, job.user_id);
  if (!template?.canva_brand_template_id) {
    throw new Error('Este template não tem Brand Template do Canva associado.');
  }

  // asset da fotografia
  let assetId: string | null = null;
  if (carousel!.photo_id) {
    const { data: photo } = await supabase
      .from('photos')
      .select('storage_path')
      .eq('id', carousel!.photo_id)
      .maybeSingle();
    if (photo?.storage_path) {
      const bytes = await downloadBuffer(supabase, photo.storage_path);
      assetId = await canva.uploadAsset(token, `carrossel-${carouselId}.png`, bytes);
    }
  }

  const { data: slides } = await supabase
    .from('slides')
    .select('*')
    .eq('carousel_id', carouselId)
    .order('idx');

  // O dataset do Canva é plano: convenção "campo_1", "campo_2", … por slide.
  const data: Record<string, canva.AutofillValue> = {};
  for (const slide of slides ?? []) {
    for (const [key, value] of Object.entries(slide.fields as Record<string, string>)) {
      if (value) data[`${key}_${slide.idx + 1}`] = { type: 'text', text: value };
    }
  }
  if (assetId) data['foto'] = { type: 'image', asset_id: assetId };

  const design = await canva.autofillDesign({
    token,
    brandTemplateId: template.canva_brand_template_id,
    title: carousel!.title,
    data,
  });

  const urls = await canva.exportDesignPng(token, design.id, template.width || 1080);

  for (let i = 0; i < urls.length; i++) {
    const res = await fetch(urls[i]);
    const bytes = Buffer.from(await res.arrayBuffer());
    const path = userPath(job.user_id, 'renders', carouselId, `${String(i + 1).padStart(2, '0')}.png`);
    await uploadBuffer(supabase, path, bytes);
    const slide = slides?.[i];
    if (slide) await supabase.from('slides').update({ render_path: path }).eq('id', slide.id);
  }

  await supabase
    .from('carousels')
    .update({
      status: 'ready',
      canva_design_id: design.id,
      error: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', carouselId);
}

// ── Despacho ─────────────────────────────────────────────────
export async function processJob(supabase: SupabaseClient, job: JobRow) {
  switch (job.type) {
    case 'write':
      return runWrite(supabase, job);
    case 'image':
      // trabalhos antigos, de quando havia geração de fotografias
      return runRender(supabase, job);
    case 'render':
      return runRender(supabase, job);
    case 'canva':
      return runCanva(supabase, job);
    default:
      throw new Error(`Tipo de trabalho desconhecido: ${job.type}`);
  }
}

/** Guarda uma chave OAuth cifrada — usado pelos callbacks. */
export async function saveIntegration(
  supabase: SupabaseClient,
  userId: string,
  provider: 'canva' | 'google',
  tokens: { access_token: string; refresh_token?: string; expires_in: number; scope?: string },
) {
  await supabase.from('integrations').upsert(
    {
      user_id: userId,
      provider,
      access_token_enc: encrypt(tokens.access_token),
      refresh_token_enc: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
      expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      scope: tokens.scope ?? null,
    },
    { onConflict: 'user_id,provider' },
  );
}
