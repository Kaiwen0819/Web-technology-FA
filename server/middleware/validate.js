import { validationResult } from "express-validator";

export function validate(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  return res.status(400).json({
    ok: false,
    errors: result.array().map(e => ({ field: e.path, msg: e.msg })),
  });
}