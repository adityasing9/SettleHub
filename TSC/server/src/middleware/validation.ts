import { Request, Response, NextFunction } from "express";
import { AnyZodObject } from "zod";

export const validateRequest = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      
      // Replace with parsed data to ensure coercion and defaults are applied
      req.body = parsed.body;
      req.query = parsed.query;
      req.params = parsed.params;
      
      return next();
    } catch (error: any) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: error.errors?.map((e: any) => ({
          field: e.path.join("."),
          message: e.message
        })) || error.message 
      });
    }
  };
};
