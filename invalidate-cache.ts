// Quick script to invalidate RAG caches after code changes
import { invalidateRAGCaches } from './lib/rag/query';

console.log('Invalidating RAG caches...');
invalidateRAGCaches();
console.log('✅ Caches invalidated! New prompt will be used on next query.');
