import { ApiError } from './http.js';

export const COMPANY_DOCUMENT_BUCKET = 'company-verification-documents';
export const COMPANY_DOCUMENT_MAX_BYTES = 1_572_864;

const documentKinds = [
  ['business_document', 'Business document'],
  ['address_document', 'Proof of address'],
];

const types = [
  { extension: 'pdf', contentType: 'application/pdf', signature: Buffer.from('%PDF-') },
  { extension: 'jpg', contentType: 'image/jpeg', signature: Buffer.from([0xff, 0xd8, 0xff]) },
  { extension: 'png', contentType: 'image/png', signature: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) },
];

export function parseCompanyDocuments(body, attemptId, required) {
  if (!required && documentKinds.every(([field]) => !body[field])) return [];

  return documentKinds.map(([field, label]) => {
    const encoded = body[field];
    const buffer = encoded && Buffer.from(encoded, 'base64');
    const type = buffer && types.find(({ signature }) => buffer.subarray(0, signature.length).equals(signature));
    if (!type || buffer.length > COMPANY_DOCUMENT_MAX_BYTES || buffer.toString('base64') !== encoded) {
      const message = `${label} must be a PDF, JPG, or PNG up to 1.5 MB.`;
      throw new ApiError(400, message, 'VALIDATION_ERROR', { fieldErrors: { [field]: message } });
    }
    return { path: `${attemptId}/${field}.${type.extension}`, buffer, contentType: type.contentType };
  });
}

export async function uploadCompanyDocuments(bucket, documents) {
  const results = await Promise.allSettled(documents.map(async ({ path, buffer, contentType }) => {
    const { error } = await bucket.upload(path, buffer, { contentType, upsert: false });
    if (error) throw error;
  }));
  if (results.some(result => result.status === 'rejected')) {
    throw new ApiError(503, 'The documents could not be uploaded. Please try again.', 'COMPANY_DOCUMENT_UPLOAD_FAILED');
  }
}
