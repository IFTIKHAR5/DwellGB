// middleware/validate.js — put this after the express-validator rules in a route:
//
//   router.post('/', [body('title').notEmpty()], validate, controller.create);
//
// If any rule failed it answers 400 with { error, details: [{ field, message }] }.
const { validationResult } = require('express-validator');

function validate(req, res, next) {
  const errors = validationResult(req).array({ onlyFirstError: true });
  if (errors.length === 0) return next();

  const details = errors.map((e) => ({ field: e.path, message: e.msg }));
  res.status(400).json({ error: details[0].message, code: 'VALIDATION_ERROR', details });
}

module.exports = { validate };
