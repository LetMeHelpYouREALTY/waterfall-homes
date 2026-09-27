const SITE_SOURCE = 'waterfallhomesnorthlasvegas.com';

const INQUIRY_TYPES = new Set([
  'General Inquiry',
  'Seller Inquiry',
  'Property Inquiry',
  'Registration',
]);

/**
 * @param {Record<string, unknown>} body
 * @returns {{ valid: true, data: ContactFields } | { valid: false, error: string }}
 */
function validateContactPayload(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  const firstName = String(body.firstName ?? '').trim();
  const lastName = String(body.lastName ?? '').trim();
  const fullName = String(body.name ?? '').trim();
  const name =
    fullName ||
    [firstName, lastName].filter(Boolean).join(' ').trim();

  const email = String(body.email ?? '').trim();
  const phone = String(body.phone ?? '').trim();

  if (!name) {
    return { valid: false, error: 'Name is required (name or firstName)' };
  }

  if (!email && !phone) {
    return { valid: false, error: 'Email or phone is required' };
  }

  const resolvedFirst = firstName || name.split(/\s+/)[0] || name;
  const resolvedLast =
    lastName || name.split(/\s+/).slice(1).join(' ').trim();

  return {
    valid: true,
    data: {
      firstName: resolvedFirst,
      lastName: resolvedLast,
      email,
      phone,
      message: String(body.message ?? '').trim(),
      formName: String(body.formName ?? body.form ?? 'Contact Form').trim(),
      page: String(body.page ?? '').trim(),
      inquiryType: normalizeInquiryType(body.type ?? body.inquiryType),
    },
  };
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function normalizeInquiryType(value) {
  const type = String(value ?? 'General Inquiry').trim();
  if (INQUIRY_TYPES.has(type)) {
    return type;
  }
  return 'General Inquiry';
}

/**
 * @param {Record<string, unknown>} body
 * @param {ContactFields} fields
 * @param {string} sourceUrl
 */
function buildEventPayload(body, fields, sourceUrl) {
  const extraLines = [];
  if (fields.page) {
    extraLines.push(`Page: ${fields.page}`);
  }
  if (body.subject) {
    extraLines.push(`Subject: ${String(body.subject)}`);
  }
  if (body.interest) {
    extraLines.push(`Interest: ${String(body.interest)}`);
  }
  if (body.timeline) {
    extraLines.push(`Timeline: ${String(body.timeline)}`);
  }

  const messageParts = [fields.message, ...extraLines].filter(Boolean);
  const message =
    messageParts.length > 0
      ? messageParts.join('\n')
      : `Inquiry from ${fields.formName}`;

  const description = fields.page
    ? `${fields.formName} — ${fields.page}`
    : fields.formName;

  const person = {
    firstName: fields.firstName,
    lastName: fields.lastName,
    tags: [SITE_SOURCE, fields.formName],
  };

  if (fields.email) {
    person.emails = [{ value: fields.email }];
  }
  if (fields.phone) {
    person.phones = [{ value: fields.phone }];
  }

  return {
    source: SITE_SOURCE,
    system: SITE_SOURCE,
    type: fields.inquiryType,
    message,
    description,
    sourceUrl,
    person,
  };
}

/**
 * @param {object} payload
 * @param {string} apiKey
 * @param {typeof fetch} [fetchImpl]
 */
async function submitEventToFub(payload, apiKey, fetchImpl = fetch) {
  const auth = Buffer.from(`${apiKey}:`, 'utf8').toString('base64');
  return fetchImpl('https://api.followupboss.com/v1/events', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
      'X-System': SITE_SOURCE,
    },
    body: JSON.stringify(payload),
  });
}

module.exports = {
  SITE_SOURCE,
  validateContactPayload,
  buildEventPayload,
  submitEventToFub,
  normalizeInquiryType,
};

/**
 * @typedef {object} ContactFields
 * @property {string} firstName
 * @property {string} lastName
 * @property {string} email
 * @property {string} phone
 * @property {string} message
 * @property {string} formName
 * @property {string} page
 * @property {string} inquiryType
 */
