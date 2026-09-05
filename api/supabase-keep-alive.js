export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const cronSecret = process.env.CRON_SECRET;
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    if (!cronSecret || !supabaseUrl || !supabaseAnonKey) {
        return res.status(500).json({ error: 'Cron environment is not configured' });
    }

    if (req.headers.authorization !== `Bearer ${cronSecret}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const response = await fetch(
            `${supabaseUrl.replace(/\/$/, '')}/rest/v1/profiles?select=id&limit=1`,
            {
                headers: {
                    apikey: supabaseAnonKey,
                    Authorization: `Bearer ${supabaseAnonKey}`,
                },
                cache: 'no-store',
            }
        );

        if (!response.ok) {
            return res.status(502).json({
                error: 'Supabase request failed',
                status: response.status,
            });
        }

        return res.status(200).json({ ok: true });
    } catch (error) {
        console.error('Supabase keep-alive failed:', error.message);
        return res.status(502).json({ error: 'Supabase request failed' });
    }
}
