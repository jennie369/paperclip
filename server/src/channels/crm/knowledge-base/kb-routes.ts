// Knowledge Base API Routes — collections, documents, search, sync

import { Router } from 'express';
import { supabase } from '../../zalo-personal/supabase.js';
import { DocumentProcessor } from './processor.js';

const router = Router();
const processor = new DocumentProcessor();

// ═══ Collections ═══

router.get('/collections', async (_req, res) => {
  try {
    const { data, error } = await supabase.from('kb_collections').select('*').order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/collections', async (req, res) => {
  try {
    const { name, description, collection_type, chunk_size, chunk_overlap } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Tên bộ sưu tập không được để trống' });

    const { data, error } = await supabase.from('kb_collections')
      .insert({ name: name.trim(), description, collection_type: collection_type || 'document', chunk_size: chunk_size || 500, chunk_overlap: chunk_overlap || 50 })
      .select('*').single();

    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json(data);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.delete('/collections/:id', async (req, res) => {
  try {
    await supabase.from('kb_collections').delete().eq('id', req.params.id);
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ═══ Documents ═══

router.get('/collections/:id/documents', async (req, res) => {
  try {
    const { data } = await supabase.from('kb_documents').select('*').eq('collection_id', req.params.id).order('created_at', { ascending: false });
    res.json(data || []);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST /kb/documents — Add document (text body, not file upload for simplicity)
router.post('/documents', async (req, res) => {
  try {
    const { collection_id, title, content, source_type } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'Nội dung không được để trống' });
    if (!collection_id) return res.status(400).json({ error: 'Chưa chọn bộ sưu tập' });

    const { createHash } = await import('crypto');
    const { data: doc, error } = await supabase.from('kb_documents')
      .insert({
        collection_id, title: title || 'Untitled', source_type: source_type || 'manual',
        raw_content: content, content_hash: createHash('md5').update(content).digest('hex'), status: 'pending',
      })
      .select('*').single();

    if (error) return res.status(400).json({ error: error.message });

    // Process async
    processor.processDocument(doc.id).catch(e => console.error('[KB] Process error:', e.message));

    res.status(201).json({ ...doc, message: 'Đang xử lý tài liệu...' });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST /kb/faq — Add FAQ
router.post('/faq', async (req, res) => {
  try {
    const { collection_id, question, answer } = req.body;
    if (!question?.trim() || !answer?.trim()) return res.status(400).json({ error: 'Câu hỏi và trả lời không được để trống' });

    const content = `Câu hỏi: ${question}\nCâu trả lời: ${answer}`;
    const { createHash } = await import('crypto');
    const { data: doc } = await supabase.from('kb_documents')
      .insert({
        collection_id, title: question.slice(0, 100), source_type: 'manual',
        raw_content: content, content_hash: createHash('md5').update(content).digest('hex'),
        metadata: { question, answer }, status: 'pending',
      })
      .select('*').single();

    if (doc) processor.processDocument(doc.id).catch(() => {});
    res.status(201).json({ success: true, document: doc });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// DELETE /kb/documents/:id — Delete document and its chunks
router.delete('/documents/:id', async (req, res) => {
  try {
    // Delete chunks first (cascade may not be set up)
    await supabase.from('kb_chunks').delete().eq('document_id', req.params.id);
    const { error } = await supabase.from('kb_documents').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ═══ Search ═══

router.post('/search', async (req, res) => {
  try {
    const { query, limit = 5 } = req.body;
    if (!query?.trim()) return res.status(400).json({ error: 'Nhập từ khóa tìm kiếm' });

    // BM25 only search (no embedding if no OpenAI key)
    const { data: results } = await supabase
      .from('kb_chunks')
      .select('id, content, document_id, metadata, kb_documents(title, source_type)')
      .textSearch('search_tokens', query, { type: 'plain' })
      .limit(limit);

    res.json({
      results: (results || []).map((r: any) => ({
        chunk_id: r.id, content: r.content, document_title: (r.kb_documents as any)?.title,
        source_type: (r.kb_documents as any)?.source_type, metadata: r.metadata,
      })),
      query,
    });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ═══ Sync ═══

// POST /kb/sync/shopify — Sync Shopify products into KB
router.post('/sync/shopify', async (_req, res) => {
  try {
    // Find or create product collection
    let { data: col } = await supabase.from('kb_collections').select('id').eq('collection_type', 'product').maybeSingle();
    if (!col) {
      const { data } = await supabase.from('kb_collections')
        .insert({ name: 'Sản phẩm Shopify', description: 'Catalog từ YinYang Masters', collection_type: 'product' })
        .select('id').single();
      col = data;
    }
    if (!col) return res.status(500).json({ error: 'Không tạo được bộ sưu tập' });

    // Fetch products from shopify_product_variants table
    const { data: products } = await supabase
      .from('shopify_product_variants')
      .select('title, price, sku, product_type, vendor');

    if (!products?.length) return res.json({ message: 'Không có sản phẩm nào', count: 0 });

    let count = 0;
    for (const p of products) {
      const content = `Sản phẩm: ${p.title}\nGiá: ${p.price}₫\nSKU: ${p.sku || 'N/A'}\nLoại: ${p.product_type || 'N/A'}\nNhà cung cấp: ${p.vendor || 'N/A'}`;
      const { createHash } = await import('crypto');
      const hash = createHash('md5').update(content).digest('hex');

      // Skip if already exists
      const { data: existing } = await supabase.from('kb_documents')
        .select('id').eq('content_hash', hash).maybeSingle();
      if (existing) continue;

      const { data: doc } = await supabase.from('kb_documents')
        .insert({ collection_id: col.id, title: p.title, source_type: 'shopify', raw_content: content, content_hash: hash, status: 'pending' })
        .select('id').single();

      if (doc) {
        processor.processDocument(doc.id).catch(() => {});
        count++;
      }
    }

    res.json({ message: `Đang sync ${count} sản phẩm mới`, count });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST /kb/sync/courses — Sync khóa học từ Shopify products
router.post('/sync/courses', async (_req, res) => {
  try {
    let { data: col } = await supabase.from('kb_collections').select('id').eq('collection_type', 'course').maybeSingle();
    if (!col) {
      const { data } = await supabase.from('kb_collections')
        .insert({ name: 'Khóa học & Sản phẩm Digital', description: 'Khóa học trading, tâm linh từ Shopify', collection_type: 'course' })
        .select('id').single();
      col = data;
    }
    if (!col) return res.status(500).json({ error: 'Không tạo được bộ sưu tập' });

    // Lấy từ Shopify products — filter digital/course products
    const shopifyStore = process.env.SHOPIFY_STORE_URL || '';
    const shopifyToken = process.env.SHOPIFY_ACCESS_TOKEN || '';

    let products: any[] = [];

    if (shopifyStore && shopifyToken) {
      // Fetch from Shopify API
      const apiRes = await fetch(`https://${shopifyStore}/admin/api/2024-01/products.json?limit=250`, {
        headers: { 'X-Shopify-Access-Token': shopifyToken },
      });
      if (apiRes.ok) {
        const json = await apiRes.json() as { products: any[] };
        // Filter digital products (courses, tiers, bundles)
        products = (json.products || []).filter((p: any) =>
          p.product_type?.toLowerCase().includes('digital') ||
          p.product_type?.toLowerCase().includes('course') ||
          p.tags?.toLowerCase().includes('course') ||
          p.tags?.toLowerCase().includes('tier') ||
          p.title?.toLowerCase().includes('khóa') ||
          p.title?.toLowerCase().includes('tier')
        );
      }
    }

    // Fallback: also check shopify_product_variants table
    if (products.length === 0) {
      const { data: variants } = await supabase.from('shopify_product_variants').select('title, price, sku, product_type');
      products = (variants || []).map(v => ({
        title: v.title,
        body_html: '',
        variants: [{ price: v.price, sku: v.sku }],
        product_type: v.product_type,
      }));
    }

    if (!products.length) return res.json({ message: 'Không tìm thấy khóa học/sản phẩm digital', count: 0 });

    let count = 0;
    for (const p of products) {
      const price = p.variants?.[0]?.price || p.price || 'Liên hệ';
      const desc = (p.body_html || '').replace(/<[^>]*>/g, '').slice(0, 1000);
      const content = `Khóa học/Sản phẩm: ${p.title}\nGiá: ${price}₫\nMô tả: ${desc || 'N/A'}\nLoại: ${p.product_type || 'digital'}`;

      const { createHash } = await import('crypto');
      const hash = createHash('md5').update(content).digest('hex');

      const { data: existing } = await supabase.from('kb_documents')
        .select('id').eq('content_hash', hash).maybeSingle();
      if (existing) continue;

      const { data: doc } = await supabase.from('kb_documents')
        .insert({ collection_id: col.id, title: p.title, source_type: 'shopify', raw_content: content, content_hash: hash, status: 'pending' })
        .select('id').single();

      if (doc) {
        processor.processDocument(doc.id).catch(() => {});
        count++;
      }
    }

    res.json({ message: `Đang sync ${count} khóa học/digital mới từ Shopify`, count });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ═══ Stats ═══

router.get('/stats', async (_req, res) => {
  try {
    const { count: collections } = await supabase.from('kb_collections').select('*', { count: 'exact', head: true });
    const { count: documents } = await supabase.from('kb_documents').select('*', { count: 'exact', head: true }).eq('status', 'ready');
    const { count: chunks } = await supabase.from('kb_chunks').select('*', { count: 'exact', head: true });
    res.json({ collections: collections || 0, documents: documents || 0, chunks: chunks || 0 });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
