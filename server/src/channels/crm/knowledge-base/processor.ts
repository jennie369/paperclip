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

  private async getEmbedding(text: string): Promise<number[]> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      // Return zero vector if no API key (development)
      console.warn('[KB] OPENAI_API_KEY not set — using zero vector');
      return new Array(1536).fill(0);
    }

    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'text-embedding-3-small', input: [text.slice(0, 8000)] }),
    });

    if (!res.ok) throw new Error(`OpenAI Embedding error: ${res.status}`);
    const data = await res.json() as { data: Array<{ embedding: number[] }> };
    return data.data[0].embedding;
  }
}
