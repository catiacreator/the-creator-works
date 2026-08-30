import { ok, withUser } from '@/lib/api';
import * as canva from '@/lib/canva';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Lista os Brand Templates do Canva e, se pedires ?dataset=<id>,
 * devolve os campos autofilláveis desse template.
 *
 * ⚠️ Só funciona com Canva Enterprise. Sem Enterprise, o Canva devolve
 * permission_denied e a app avisa-te para usar o motor local.
 */
export const GET = withUser(async ({ user, supabase, request }) => {
  const { data: integration } = await supabase
    .from('integrations')
    .select('*')
    .eq('user_id', user.id)
    .eq('provider', 'canva')
    .maybeSingle();
  if (!integration) throw new Error('Canva não está ligado.');

  const token = await canva.validAccessToken(integration, async (patch) => {
    await supabase.from('integrations').update(patch).eq('id', integration.id);
  });

  const { searchParams } = new URL(request.url);
  const datasetFor = searchParams.get('dataset');

  if (datasetFor) {
    const dataset = await canva.getBrandTemplateDataset(token, datasetFor);
    return ok({ dataset });
  }

  const templates = await canva.listBrandTemplates(token);
  return ok({ templates });
});
