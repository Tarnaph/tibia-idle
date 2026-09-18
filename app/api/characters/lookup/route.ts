import { NextResponse } from 'next/server';
import { prisma } from '@/packages/database/src';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name')?.trim();

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Nome do personagem não fornecido.' },
        { status: 400 }
      );
    }

    // Try exact match first
    let character = await prisma.character.findUnique({
      where: { name },
      select: {
        id: true,
        name: true,
        level: true,
        vocationId: true,
        vocationName: true,
        promotion: true,
        health: true,
        maxHealth: true,
        mana: true,
        maxMana: true,
        outfit: true,
        outfitHead: true,
        outfitBody: true,
        outfitLegs: true,
        outfitFeet: true,
        outfitAddons: true,
        mount: true,
        mountActive: true,
        isOnline: true,
        skills: {
          select: {
            skillId: true,
            skillName: true,
            value: true,
          },
        },
        inventory: {
          select: {
            slot: true,
            serverId: true,
            count: true,
            tier: true,
            attributesJson: true,
          },
        },
      },
    });

    // Fallback case-insensitive match for SQLite
    if (!character) {
      const all = await prisma.character.findMany({
        select: {
          id: true,
          name: true,
          level: true,
          vocationId: true,
          vocationName: true,
          promotion: true,
          health: true,
          maxHealth: true,
          mana: true,
          maxMana: true,
          outfit: true,
          outfitHead: true,
          outfitBody: true,
          outfitLegs: true,
          outfitFeet: true,
          outfitAddons: true,
          mount: true,
          mountActive: true,
          isOnline: true,
          skills: {
            select: {
              skillId: true,
              skillName: true,
              value: true,
            },
          },
          inventory: {
            select: {
              slot: true,
              serverId: true,
              count: true,
              tier: true,
              attributesJson: true,
            },
          },
        },
      });
      character = all.find((c) => c.name.toLowerCase() === name.toLowerCase()) ?? null;
    }

    if (!character) {
      return NextResponse.json(
        { success: false, error: `Personagem "${name}" não existe no servidor.` },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, character }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Erro ao consultar personagem.' },
      { status: 500 }
    );
  }
}
