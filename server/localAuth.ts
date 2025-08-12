import { Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import bcrypt from "bcrypt";

// Função para hash de senhas
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

// Função para verificar senhas
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

// Middleware de autenticação
export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  console.log(`🔐 AUTH CHECK - Session exists: ${!!req.session}`);
  console.log(`🔐 AUTH CHECK - UserId in session: ${(req.session as any)?.userId}`);
  
  if (req.session && (req.session as any).userId) {
    console.log(`✅ AUTH CHECK - Usuario autenticado: ${(req.session as any).userId}`);
    return next();
  }
  
  console.log(`❌ AUTH CHECK - Unauthorized - No session or userId`);
  return res.status(401).json({ message: "Unauthorized" });
};

// Middleware para verificar se é admin
export const isAdmin = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.session || !(req.session as any).userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const user = await storage.getUser((req.session as any).userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: "Access denied. Admin only." });
    }
    next();
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Criar usuário administrador padrão se não existir
export async function createDefaultAdmin() {
  try {
    const adminUser = await storage.getUserByUsername("admin");
    if (!adminUser) {
      const hashedPassword = await hashPassword("admin123");
      await storage.createUser({
        username: "admin",
        password: hashedPassword,
        email: "admin@sistema.local",
        firstName: "Administrador",
        lastName: "Sistema",
        role: "admin",
        isActive: true,
      });
      console.log("Usuário administrador padrão criado: admin / admin123");
    }
  } catch (error) {
    console.error("Erro ao criar usuário administrador:", error);
  }
}