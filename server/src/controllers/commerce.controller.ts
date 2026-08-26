import { Request, Response } from 'express';
import { db } from '../db/db';
import { CommerceAgent } from '../agents/commerce-agent';

export class CommerceController {
  public static getProducts(req: Request, res: Response) {
    const products = db.getProducts();
    const category = req.query.category as string;
    const search = req.query.search as string;

    let filtered = [...products];

    if (category && category !== 'All') {
      filtered = filtered.filter(p => p.category.toLowerCase() === category.toLowerCase());
    }

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        p =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.tags.some(t => t.toLowerCase().includes(q))
      );
    }

    return res.json({
      success: true,
      count: filtered.length,
      products: filtered
    });
  }

  public static getProductById(req: Request, res: Response) {
    const { id } = req.params;
    const product = db.getProductById(id);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    return res.json({ success: true, product });
  }

  public static async chatWithAgent(req: Request, res: Response) {
    const { message, history } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }

    try {
      const response = await CommerceAgent.processMessage(message, history || []);
      return res.json({ success: true, response });
    } catch (e: any) {
      console.error('Commerce chat error:', e);
      return res.status(500).json({ success: false, error: e.message });
    }
  }
}
