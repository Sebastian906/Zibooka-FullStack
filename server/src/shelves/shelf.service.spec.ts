import { ShelfService } from './shelf.service';

/**
 * Tests del algoritmo de Branch & Bound (mochila 0/1).
 *
 * Estrategia: Invocamos directamente solveKnapsackBranchAndBound(),
 * que es lógica pura sin acceso a BD. No se necesitan mocks de Mongoose.
 *
 * Se valida optimalidad comparando contra fuerza bruta O(2^n)
 * para instancias pequeñas (n < 15).
 */

// ─── Fuerza bruta de referencia ──────────────────────────────
function bruteForceKnapsack(
  items: Array<{ id: string; weight: number; value: number }>,
  maxWeight: number
): { selectedIds: string[]; totalValue: number; totalWeight: number } {
  let bestValue = 0;
  let bestSelection: string[] = [];
  let bestWeight = 0;
  const n = items.length;

  for (let mask = 0; mask < (1 << n); mask++) {
    let currentWeight = 0;
    let currentValue = 0;
    const selected: string[] = [];

    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) {
        currentWeight += items[i].weight;
        currentValue += items[i].value;
        selected.push(items[i].id);
      }
    }

    if (currentWeight <= maxWeight && currentValue > bestValue) {
      bestValue = currentValue;
      bestSelection = [...selected];
      bestWeight = currentWeight;
    }
  }

  return {
    selectedIds: bestSelection,
    totalValue: bestValue,
    totalWeight: parseFloat(bestWeight.toFixed(4)),
  };
}

// ─── Tests ───────────────────────────────────────────────────
describe('ShelfService - Branch & Bound Algorithm', () => {
  let service: ShelfService;

  beforeEach(() => {
    // Instancia sin modelos reales: el algoritmo no accede a DB
    service = new ShelfService(null as any, null as any);
  });

  // ═══════════════════════════════════════════════════════
  // 1. OPTIMALIDAD VS FUERZA BRUTA
  //    Criterio del issue: "Tests comparan la solución con
  //    fuerza bruta para n < 15 (misma solución)"
  // ═══════════════════════════════════════════════════════
  describe('Optimalidad vs Fuerza Bruta', () => {
    const cases = [
      {
        name: 'n=3: básicos',
        items: [
          { id: 'b1', weight: 2, value: 100 },
          { id: 'b2', weight: 3, value: 120 },
          { id: 'b3', weight: 1.5, value: 80 },
        ],
        maxWeight: 5,
      },
      {
        name: 'n=5: mezcla de pesos',
        items: [
          { id: 'b1', weight: 1, value: 50 },
          { id: 'b2', weight: 2, value: 120 },
          { id: 'b3', weight: 3, value: 200 },
          { id: 'b4', weight: 1.5, value: 80 },
          { id: 'b5', weight: 2.5, value: 150 },
        ],
        maxWeight: 6,
      },
      {
        name: 'n=5: todos caben individualmente',
        items: [
          { id: 'b1', weight: 1, value: 200 },
          { id: 'b2', weight: 1, value: 150 },
          { id: 'b3', weight: 1, value: 180 },
          { id: 'b4', weight: 1, value: 100 },
          { id: 'b5', weight: 1, value: 90 },
        ],
        maxWeight: 3,
      },
      {
        name: 'n=8: con libro muy pesado',
        items: [
          { id: 'b1', weight: 0.5, value: 30 },
          { id: 'b2', weight: 1, value: 80 },
          { id: 'b3', weight: 1.5, value: 120 },
          { id: 'b4', weight: 2, value: 200 },
          { id: 'b5', weight: 2.5, value: 100 },
          { id: 'b6', weight: 3, value: 250 },
          { id: 'b7', weight: 5, value: 400 },
          { id: 'b8', weight: 0.8, value: 60 },
        ],
        maxWeight: 4,
      },
      {
        name: 'n=10: ratios variados',
        items: [
          { id: 'b1', weight: 0.3, value: 100 },
          { id: 'b2', weight: 0.5, value: 200 },
          { id: 'b3', weight: 1, value: 150 },
          { id: 'b4', weight: 1.2, value: 300 },
          { id: 'b5', weight: 0.8, value: 180 },
          { id: 'b6', weight: 2, value: 400 },
          { id: 'b7', weight: 1.5, value: 250 },
          { id: 'b8', weight: 0.6, value: 120 },
          { id: 'b9', weight: 1.8, value: 350 },
          { id: 'b10', weight: 0.4, value: 90 },
        ],
        maxWeight: 5,
      },
      {
        name: 'n=12: pesos fraccionarios',
        items: [
          { id: 'b1', weight: 0.2, value: 50 },
          { id: 'b2', weight: 0.7, value: 180 },
          { id: 'b3', weight: 1.1, value: 220 },
          { id: 'b4', weight: 0.4, value: 90 },
          { id: 'b5', weight: 1.8, value: 350 },
          { id: 'b6', weight: 0.9, value: 160 },
          { id: 'b7', weight: 2.3, value: 420 },
          { id: 'b8', weight: 0.6, value: 130 },
          { id: 'b9', weight: 1.4, value: 280 },
          { id: 'b10', weight: 0.3, value: 70 },
          { id: 'b11', weight: 1.7, value: 310 },
          { id: 'b12', weight: 0.5, value: 110 },
        ],
        maxWeight: 4.5,
      },
      {
        name: 'n=15: caso completo',
        items: Array.from({ length: 15 }, (_, i) => ({
          id: `b${i + 1}`,
          weight: parseFloat((0.3 + (i % 6) * 0.4).toFixed(1)),
          value: 50 + i * 35,
        })),
        maxWeight: 5,
      },
    ];

    cases.forEach(({ name, items, maxWeight }) => {
      it(`branch & bound = fuerza bruta: ${name}`, () => {
        const bb = service.solveKnapsackBranchAndBound(items, maxWeight);
        const bf = bruteForceKnapsack(items, maxWeight);

        expect(bb.totalValue).toBe(bf.totalValue);
        expect(bb.totalWeight).toBe(bf.totalWeight);
      });
    });
  });

  // ═══════════════════════════════════════════════════════
  // 2. PODA EFECTIVA
  //    El algoritmo Branch & Bound reduce drásticamente los
  //    nodos explorados vs backtracking puro O(2^n).
  //    La tasa de poda exacta depende de la distribución
  //    de ratios valor/peso de los datos de entrada.
  // ═══════════════════════════════════════════════════════
  describe('Efectividad de la poda', () => {
    it('n=15: explora < 1000 nodos (vs 32K fuerza bruta)', () => {
      const items = Array.from({ length: 15 }, (_, i) => ({
        id: `b${i}`,
        weight: 0.5 + (i % 5) * 0.5,
        value: 100 + i * 30,
      }));

      const result = service.solveKnapsackBranchAndBound(items, 5);
      // Backtracking puro: 2^15 = 32,768 nodos
      // Branch & Bound: típicamente < 1000
      expect(result.stats.nodesExplored).toBeLessThan(1000);
      // Verificar que la poda ocurre
      expect(result.stats.nodesPruned).toBeGreaterThan(0);
      // Verificar optimalidad
      const bf = bruteForceKnapsack(items, 5);
      expect(result.totalValue).toBe(bf.totalValue);
    });

    it('n=20: explora < 3000 nodos (vs 1M fuerza bruta)', () => {
      const items = Array.from({ length: 20 }, (_, i) => ({
        id: `b${i}`,
        weight: 0.3 + (i % 7) * 0.4,
        value: 50 + i * 25,
      }));

      const result = service.solveKnapsackBranchAndBound(items, 6);
      // Backtracking puro: 2^20 = 1,048,576 nodos
      // Branch & Bound: típicamente < 3000
      expect(result.stats.nodesExplored).toBeLessThan(3000);
      expect(result.stats.nodesPruned).toBeGreaterThan(0);
      const bf = bruteForceKnapsack(items, 6);
      expect(result.totalValue).toBe(bf.totalValue);
    });

    it('n=25: explora < 10,000 nodos (vs 33M fuerza bruta)', () => {
      const items = Array.from({ length: 25 }, (_, i) => ({
        id: `b${i}`,
        weight: 0.2 + (i % 8) * 0.3,
        value: 30 + i * 20,
      }));

      const result = service.solveKnapsackBranchAndBound(items, 7);
      // Backtracking puro: 2^25 = 33,554,432 nodos
      // Branch & Bound: típicamente < 10,000
      expect(result.stats.nodesExplored).toBeLessThan(10000);
      expect(result.stats.nodesPruned).toBeGreaterThan(0);
    });

    it('ratios uniformes: poda menor pero sigue siendo óptimo', () => {
      // Caso descrito en el issue: "Si todos los libros tienen el mismo
      // ratio, la poda es mínima." El comportamiento es similar al
      // backtracking original, pero sigue siendo correcto.
      const items = Array.from({ length: 15 }, (_, i) => ({
        id: `b${i}`,
        weight: 0.5 + (i % 5) * 0.5,
        value: 100 + i * 30,
      }));

      const result = service.solveKnapsackBranchAndBound(items, 5);
      const bf = bruteForceKnapsack(items, 5);
      expect(result.totalValue).toBe(bf.totalValue);
      // Con ratios uniformes, la poda es menor pero el resultado es correcto
    });
  });

  // ═══════════════════════════════════════════════════════
  // 3. EDGE CASES
  //    Criterios del issue:
  //    - "Si maxWeight es 0 o negativo, retorna error inmediato"
  //    - "Si no hay libros que quepan, retorna selección vacía"
  // ═══════════════════════════════════════════════════════
  describe('Edge Cases', () => {
    it('maxWeight = 0 → selección vacía', () => {
      const result = service.solveKnapsackBranchAndBound(
        [{ id: 'b1', weight: 1, value: 100 }],
        0
      );
      expect(result.selectedIds).toEqual([]);
      expect(result.totalValue).toBe(0);
      expect(result.totalWeight).toBe(0);
    });

    it('maxWeight negativo → selección vacía', () => {
      const result = service.solveKnapsackBranchAndBound(
        [{ id: 'b1', weight: 1, value: 100 }],
        -5
      );
      expect(result.selectedIds).toEqual([]);
      expect(result.totalValue).toBe(0);
    });

    it('sin libros → selección vacía', () => {
      const result = service.solveKnapsackBranchAndBound([], 10);
      expect(result.selectedIds).toEqual([]);
      expect(result.totalValue).toBe(0);
    });

    it('ningún libro cabe → selección vacía', () => {
      const items = [
        { id: 'b1', weight: 10, value: 500 },
        { id: 'b2', weight: 15, value: 800 },
      ];
      const result = service.solveKnapsackBranchAndBound(items, 5);
      expect(result.selectedIds).toEqual([]);
      expect(result.totalValue).toBe(0);
    });

    it('un solo libro que cabe → se selecciona', () => {
      const result = service.solveKnapsackBranchAndBound(
        [{ id: 'b1', weight: 2, value: 300 }],
        5
      );
      expect(result.selectedIds).toEqual(['b1']);
      expect(result.totalValue).toBe(300);
    });

    it('libro con peso 0 y valor positivo → se selecciona (es gratis)', () => {
      // Un libro con peso=0 y valor=100 es "gratis": agrega valor sin
      // consumir capacidad. Matemáticamente, siempre debe seleccionarse.
      const items = [
        { id: 'b_zero', weight: 0, value: 100 },
        { id: 'b_normal', weight: 2, value: 200 },
      ];
      const result = service.solveKnapsackBranchAndBound(items, 5);
      expect(result.selectedIds).toContain('b_zero');
      expect(result.selectedIds).toContain('b_normal');
      expect(result.totalValue).toBe(300); // 100 + 200
    });

    it('todos los libros idénticos → llena capacidad', () => {
      const items = [
        { id: 'b1', weight: 1, value: 100 },
        { id: 'b2', weight: 1, value: 100 },
        { id: 'b3', weight: 1, value: 100 },
        { id: 'b4', weight: 1, value: 100 },
      ];
      const result = service.solveKnapsackBranchAndBound(items, 3);
      expect(result.selectedIds).toHaveLength(3);
      expect(result.totalValue).toBe(300);
      expect(result.totalWeight).toBe(3);
    });

    it('un solo libro supera la capacidad → vacío', () => {
      const result = service.solveKnapsackBranchAndBound(
        [{ id: 'b1', weight: 10, value: 500 }],
        5
      );
      expect(result.selectedIds).toEqual([]);
      expect(result.totalValue).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════
  // 4. ESTADÍSTICAS
  // ═══════════════════════════════════════════════════════
  describe('Estadísticas', () => {
    it('retorna estadísticas válidas', () => {
      const items = Array.from({ length: 10 }, (_, i) => ({
        id: `b${i}`,
        weight: 1 + i * 0.5,
        value: 100 + i * 50,
      }));

      const result = service.solveKnapsackBranchAndBound(items, 8);

      expect(result.stats.nodesExplored).toBeGreaterThan(0);
      expect(result.stats.nodesPruned).toBeGreaterThanOrEqual(0);
      expect(result.stats.prunedPercentage).toBeGreaterThanOrEqual(0);
      expect(result.stats.prunedPercentage).toBeLessThanOrEqual(100);
    });

    it('un solo libro → al menos 1 nodo podado (rama "no tomar")', () => {
      // Con 1 libro, el algoritmo primero explora "tomar el libro" (bestValue=100),
      // luego intenta "no tomar el libro" pero lo poda porque
      // currentValue(0) + bound(100) ≤ bestValue(100). Siempre hay poda.
      const result = service.solveKnapsackBranchAndBound(
        [{ id: 'b1', weight: 1, value: 100 }],
        5
      );
      expect(result.stats.nodesExplored).toBeGreaterThanOrEqual(2);
      expect(result.stats.nodesPruned).toBeGreaterThanOrEqual(1);
    });
  });
});