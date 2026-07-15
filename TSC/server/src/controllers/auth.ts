import { Request, Response } from "express";
import * as bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";
import { prisma } from "../db";
import { z } from "zod";

const JWT_SECRET = process.env.JWT_SECRET || "smartsplit_super_secret_key_12873491823";

// Validation Schemas
export const registerSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(6),
    name: z.string().min(2),
    phone: z.string().optional(),
    upiId: z.string().optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string(),
  }),
});

export const verifySchema = z.object({
  body: z.object({
    email: z.string().email(),
    code: z.string(),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email(),
  }),
});

export async function register(req: Request, res: Response) {
  try {
    const { email, password, name, phone, upiId } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: "Email is already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    
    // For demo purposes, we automatically set verified = false
    // but return the verification code "123456" in the response so they can proceed immediately.
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        phone,
        upiId,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
        isVerified: false,
      },
    });

    return res.status(201).json({
      message: "Registration successful! Please verify your email with the code sent.",
      verificationCode: "123456", // Mock verification code for testing ease
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error: any) {
    console.error("Register Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        phone: user.phone,
        upiId: user.upiId,
        isVerified: user.isVerified,
        role: user.role,
      },
    });
  } catch (error: any) {
    console.error("Login Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function verify(req: Request, res: Response) {
  try {
    const { email, code } = req.body;

    if (code !== "123456") {
      return res.status(400).json({ error: "Invalid verification code" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    await prisma.user.update({
      where: { email },
      data: { isVerified: true },
    });

    return res.json({ message: "Email verified successfully!" });
  } catch (error: any) {
    console.error("Verification Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function forgotPassword(req: Request, res: Response) {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    
    if (!user) {
      return res.status(404).json({ error: "User with this email does not exist" });
    }

    // Mock link generation
    const resetToken = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "1h" });
    const resetLink = `http://localhost:5173/reset-password?token=${resetToken}`;

    return res.json({
      message: "Password reset instructions sent to your email",
      resetLink, // returned to the client to make testing easier without SMTP
    });
  } catch (error: any) {
    console.error("Forgot Password Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getProfile(req: any, res: Response) {
  try {
    const userId = req.user?.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        phone: true,
        upiId: true,
        bankName: true,
        bankAccount: true,
        bankIfsc: true,
        isVerified: true,
        role: true,
      }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json(user);
  } catch (error: any) {
    console.error("Get Profile Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function updateProfile(req: any, res: Response) {
  try {
    const userId = req.user?.id;
    const { name, phone, upiId, bankName, bankAccount, bankIfsc } = req.body;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        phone,
        upiId,
        bankName,
        bankAccount,
        bankIfsc,
      },
    });

    return res.json({
      message: "Profile updated successfully",
      user: {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        avatar: updated.avatar,
        phone: updated.phone,
        upiId: updated.upiId,
        bankName: updated.bankName,
        bankAccount: updated.bankAccount,
        bankIfsc: updated.bankIfsc,
      }
    });
  } catch (error: any) {
    console.error("Update Profile Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
