// Document Processor — chunk text + generate embeddings + store in kb_chunks

import { createHash } from 'crypto';
import { supabase } from '../../zalo-personal/supabase.js';

export class DocumentProcessor {

  async processDocument(documentId: string): Promise<void> {
    try {
      // Update status
      await supabase.from('kb_documents').update({ status: 'processing' }).eq('id', documentId);

      // Load document
      const { data: doc } = await supabase.from('kb_documents')
        .select('id, collection_id, raw_content, title')
        .eq('id', documentId).single();

      if (!doc?.raw_content) {
        await supabase.from('kb_documents').update({ status: 'error', error_message: 'Nội dung trống' }).eq('id', documentId);
        return;
      }

      // Load collection config
      const { data: col } = await supabase.from('kb_collections')
        .select('chunk_size, chunk_overlap').eq('id', doc.collection_id).single();

      const chunkSize = col?.chunk_size || 500;
      const chunkOverlap = col?.chunk_overlap || 50;

      // Chunk the text
      const chunks = this.chunkText(doc.raw_content, chunkSize, chunkOverlap);

      // Delete old chunks
      await supabase.from('kb_chunks').delete().eq('document_id', documentId);

      // Generate embeddings + insert chunks
      for (let i = 0; i < chunks.length; i++) {
        const embedding = await this.getEmbedding(chunks[i]);

        await supabase.from('kb_chunks').insert({
          document_id: documentId,
          collection_id: doc.collection_id,
          content: chunks[i],
          chunk_index: i,
          embedding,
          metadata: { title: doc.title, chunk_of: chunks.length },
        });
      }

      // Update document status
      await supabase.from('kb_documents').update({
        status: 'ready',
        chunk_count: chunks.length,
        updated_at: new Date().toISOString(),
      }).eq('id', documentId);

      // Update collection stats
      const { count } = await supabase.from('kb_chunks')
        .select('*', { count: 'exact', head: true })
        .eq('collection_id', doc.collection_id);

      const { count: docCount } = await supabase.from('kb_documents')
        .select('*', { count: 'exact', head: true })
        .eq('collection_id', doc.collection_id).eq('status', 'ready');

      await supabase.from('kb_collections').update({
        document_count: docCount || 0,
        chunk_count: count || 0,
        last_synced_at: new Date().toISOString(),
      }).eq('id', doc.collection_id);

      console.log(`[KB] Processed ${doc.title}: ${chunks.length} chunks`);
    } catch (err: any) {
      console.error(`[KB] Process error:`, err.message);
      await supabase.from('kb_documents').update({
        status: 'error', error_message: err.message,
      }).eq('id', documentId);
    }
  }

  private chunkText(text: string, size: number, overlap: number): string[] {
    const chunks: string[] = [];
    const sentences = text.split(/(?<=[.!?\n])\s+/);
    let current = '';

    for (const sentence of sentences) {
      if ((current + ' ' + sentence).length > size && current.length > 0) {
        chunks.push(current.trim());
        // Keep overlap
        const words = current.split(' ');
        const overlapWords = words.slice(-Math.ceil(overlap / 5));
        current = overlapWords.join(' ') + ' ' + sentence;
      } else {
        current += (current ? ' ' : '') + sentence;
      }
    }
    if (current.trim()) chunks.push(current.trim());
    return chunks;
  }

  // ⚠ 2026-07-04: repoint OpenAI text-embedding-3-small (1536) → bge-m3 LOCAL service (1024)
  // để KHỚP kb_chunks vector(1024). Fail-fast khi service down (KHÔNG zero-vector 1536 → dim
  // mismatch CÂM với cột 1024). PHẢI đồng bộ với mcp-server.ts getEmbedding (query-time).
  private async getEmbedding(text: string): Promise<number[]> {
    const url = process.env.EMBED_SERVICE_URL;
    if (!url) {
      throw new Error('[KB] EMBED_SERVICE_URL chưa set — bge-m3 embed service (scripts/embed_service.py) phải chạy. KHÔNG fallback zero-vector (dim mismatch câm với kb_chunks vector(1024)).');
    }
    const key = process.env.EMBED_SERVICE_KEY || '';
    const res = await fetch(`${url.replace(/\/$/, '')}/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(key ? { 'x-embed-key': key } : {}) },
      body: JSON.stringify({ texts: [text.slice(0, 8000)] }),
    });
    if (!res.ok) throw new Error(`bge-m3 embed error: ${res.status}`);
    const data = await res.json() as { vectors: number[][] };
    return data.vectors[0];
  }
}
