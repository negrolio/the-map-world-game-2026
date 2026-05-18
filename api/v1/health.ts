type VercelResponse = {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
};

export default function handler(
  req: { method?: string },
  res: VercelResponse,
): void {
  if (req.method !== undefined && req.method !== 'GET') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  res.status(200).json({ ok: true });
}
