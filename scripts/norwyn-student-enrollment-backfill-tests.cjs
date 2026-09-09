const assert = require('node:assert/strict');

function isBundleChild(row) {
  return /^HP\d+C\d+$/i.test(String(row.transaction_id || ''));
}

function classifyEnrollmentCandidate(row, context) {
  const existingBySaleId = context.existingBySaleId || new Set();
  const customersByEmail = context.customersByEmail || new Map();
  const canonicalByHotmartProductId = context.canonicalByHotmartProductId || new Map();
  const ambiguousProductIds = context.ambiguousProductIds || new Set();

  if (existingBySaleId.has(row.id)) return { category: 'ALREADY_MATERIALIZED', reason: 'existing_purchase_sale_id' };
  if (!row.commercial_transaction || !row.sale_confirmed || !row.student_eligible) return { category: 'NOT_ELIGIBLE', reason: 'not_student_eligible_sale' };
  if (isBundleChild(row)) return { category: 'NOT_ELIGIBLE', reason: 'bundle_child_excluded' };
  const customer = row.comprador_email ? customersByEmail.get(String(row.comprador_email).toLowerCase()) : null;
  if (!customer) return { category: 'REVIEW_REQUIRED', reason: row.comprador_email ? 'customer_not_found' : 'missing_buyer_email' };
  if (!row.hotmart_product_id) return { category: 'REVIEW_REQUIRED', reason: 'missing_hotmart_product_id' };
  if (ambiguousProductIds.has(String(row.hotmart_product_id))) return { category: 'REVIEW_REQUIRED', reason: 'ambiguous_product_identity' };
  if (!canonicalByHotmartProductId.has(String(row.hotmart_product_id))) return { category: 'REVIEW_REQUIRED', reason: 'canonical_product_not_validated' };
  return { category: 'SAFE_TO_INSERT', reason: 'safe_external_product_identity', customerId: customer.id, canonicalProductId: canonicalByHotmartProductId.get(String(row.hotmart_product_id)) };
}

const context = {
  existingBySaleId: new Set(['sale_existing']),
  customersByEmail: new Map([['aluna@example.com', { id: 'customer_1' }]]),
  canonicalByHotmartProductId: new Map([['1266044', 'product_zumbido']]),
  ambiguousProductIds: new Set(['ambiguous_product']),
};

const baseSale = {
  id: 'sale_new',
  transaction_id: 'HP123',
  comprador_email: 'aluna@example.com',
  hotmart_product_id: '1266044',
  commercial_transaction: true,
  sale_confirmed: true,
  student_eligible: true,
};

assert.equal(classifyEnrollmentCandidate(baseSale, context).category, 'SAFE_TO_INSERT');
assert.equal(classifyEnrollmentCandidate({ ...baseSale, id: 'sale_existing' }, context).category, 'ALREADY_MATERIALIZED');
assert.equal(classifyEnrollmentCandidate({ ...baseSale, transaction_id: 'HP123C1' }, context).reason, 'bundle_child_excluded');
assert.equal(classifyEnrollmentCandidate({ ...baseSale, hotmart_product_id: 'sem-canonical' }, context).reason, 'canonical_product_not_validated');
assert.equal(classifyEnrollmentCandidate({ ...baseSale, comprador_email: 'missing@example.com' }, context).reason, 'customer_not_found');
assert.equal(classifyEnrollmentCandidate({ ...baseSale, hotmart_product_id: 'ambiguous_product' }, context).reason, 'ambiguous_product_identity');
assert.equal(classifyEnrollmentCandidate({ ...baseSale, sale_confirmed: false }, context).reason, 'not_student_eligible_sale');

console.log('Student enrollment backfill tests passed');
