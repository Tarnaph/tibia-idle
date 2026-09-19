import { NextResponse } from 'next/server';
import { prisma } from '@/packages/database/src';

const SKILL_CATEGORY_MAP: Record<string, number> = {
  fist: 0,
  club: 1,
  sword: 2,
  axe: 3,
  distance: 4,
  shielding: 5,
  magic: 7,
};

type CharacterSkillRecord = {
  skillId: number;
  value: number;
  tries: bigint | number;
};

type CharacterRecord = {
  id: string;
  name: string;
  level: number;
  experience: bigint | number;
  vocationName: string;
  bossPoints: number;
  bestiaryKillsJson: string | null;
  skills: CharacterSkillRecord[];
  account?: {
    email: string;
  } | null;
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = (searchParams.get('category') || 'level').toLowerCase();
    const vocationFilter = (searchParams.get('vocation') || 'all').toLowerCase();
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.max(1, Math.min(100, parseInt(searchParams.get('pageSize') || '25', 10)));
    const targetCharacterId = searchParams.get('characterId') || null;

    // Condição de filtro de vocação
    const whereCondition: any = {};
    if (vocationFilter && vocationFilter !== 'all') {
      whereCondition.vocationName = {
        contains: vocationFilter,
      };
    }

    // Busca de personagens no banco de dados com suas skills e conta
    const allCharacters = (await (prisma.character as any).findMany({
      where: whereCondition,
      include: {
        skills: true,
        account: {
          select: {
            email: true,
          },
        },
      },
    })) as CharacterRecord[];

    // Exclusão estrita de contas e personagens de teste
    const isTestCharacter = (char: CharacterRecord): boolean => {
      const name = (char.name || '').toLowerCase();
      const email = (char.account?.email || '').toLowerCase();
      if (
        name.includes('teste') ||
        name.includes('test') ||
        name.includes('browserhero') ||
        name.includes('atlashero') ||
        name.startsWith('dummy')
      ) {
        return true;
      }
      if (
        email.includes('teste@') ||
        email.includes('test@') ||
        email.includes('browsere2e') ||
        email.includes('e2e') ||
        email.startsWith('teste')
      ) {
        return true;
      }
      return false;
    };

    const validCharacters = allCharacters.filter((char) => !isTestCharacter(char));

    // Função de extração da métrica para ordenação (level, magic, fist, sword, axe, club, distance, shielding)
    const getMetric = (char: CharacterRecord): { primary: number; secondary: number; displayValue: string; secondaryValue: string } => {
      if (category in SKILL_CATEGORY_MAP) {
        const skillId = SKILL_CATEGORY_MAP[category];
        const sk = char.skills.find((s: CharacterSkillRecord) => s.skillId === skillId);
        const val = sk?.value ?? (category === 'magic' ? 0 : 10);
        const tries = Number(sk?.tries ?? 0);
        return {
          primary: val,
          secondary: tries,
          displayValue: `${val}`,
          secondaryValue: `Nível ${char.level}`,
        };
      }

      // Default: Level com desempate por experiência
      const expNum = Number(char.experience || 0);
      return {
        primary: char.level,
        secondary: expNum,
        displayValue: `${char.level}`,
        secondaryValue: `${expNum.toLocaleString('pt-BR')} XP`,
      };
    };

    // Ordenação estrita decrescente
    const sorted = validCharacters
      .map((char) => {
        const metric = getMetric(char);
        return {
          char,
          metric,
        };
      })
      .sort((a, b) => {
        if (b.metric.primary !== a.metric.primary) {
          return b.metric.primary - a.metric.primary;
        }
        return b.metric.secondary - a.metric.secondary;
      });

    const totalCount = sorted.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    // Localização do jogador requisitante (se fornecido)
    let myRank: number | undefined;
    let myPage: number | undefined;
    if (targetCharacterId) {
      const idx = sorted.findIndex((item) => item.char.id === targetCharacterId);
      if (idx !== -1) {
        myRank = idx + 1;
        myPage = Math.ceil(myRank / pageSize);
      }
    }

    // Paginação dos resultados
    const startIdx = (page - 1) * pageSize;
    const pageItems = sorted.slice(startIdx, startIdx + pageSize);

    const entries = pageItems.map((item, index) => {
      const rank = startIdx + index + 1;
      const c = item.char;
      const accountLabel = c.account?.email ? c.account.email.split('@')[0] : 'Conta';

      return {
        rank,
        id: c.id,
        name: `${c.name} (${accountLabel})`,
        characterName: c.name,
        accountName: accountLabel,
        vocation: c.vocationName || 'None',
        level: c.level,
        displayValue: item.metric.displayValue,
        secondaryValue: item.metric.secondaryValue,
        isCurrentPlayer: c.id === targetCharacterId,
      };
    });

    return NextResponse.json({
      success: true,
      entries,
      totalCount,
      page,
      totalPages,
      category,
      vocation: vocationFilter,
      myRank,
      myPage,
    });
  } catch (error: any) {
    console.error('[HIGHSCORES API] Erro ao carregar ranking:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Falha ao buscar ranking.' },
      { status: 500 }
    );
  }
}
