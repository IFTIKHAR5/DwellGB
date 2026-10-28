// models/plugins.js — consistent JSON output for every model:
// exposes `id` (string) instead of `_id`, and hides `__v`.
function toJSONPlugin(schema) {
  const transform = (doc, ret) => {
    ret.id = String(ret._id);
    delete ret._id;
    delete ret.__v;
    return ret;
  };
  schema.set('toJSON', { virtuals: false, versionKey: false, transform });
  schema.set('toObject', { virtuals: false, versionKey: false, transform });
}

module.exports = { toJSONPlugin };
