import { MaxHeap } from './max-heap';

function assert(condition: boolean, message: string) {
    if (!condition) {
        console.error(`❌ FAIL: ${message}`);
        process.exit(1);
    }
    console.log(`✅ PASS: ${message}`);
}

const heap = new MaxHeap();

// Test 1: Heap vacío
assert(heap.isEmpty(), 'Heap inicia vacío');
assert(heap.size() === 0, 'Tamaño inicial es 0');
assert(heap.peek() === null, 'peek() retorna null en heap vacío');
assert(heap.pop() === null, 'pop() retorna null en heap vacío');

// Test 2: Push y orden de prioridad
heap.push({ orderId: 'A', priority: 10, createdAt: new Date() });
heap.push({ orderId: 'B', priority: 5, createdAt: new Date() });
heap.push({ orderId: 'C', priority: 15, createdAt: new Date() });
heap.push({ orderId: 'D', priority: 8, createdAt: new Date() });

assert(heap.size() === 4, 'Tamaño es 4 después de 4 pushes');
assert(heap.peek()?.orderId === 'C', 'peek() retorna la de mayor prioridad (C=15)');

// Test 3: Pop extrae en orden descendente
const first = heap.pop();
assert(first?.orderId === 'C', 'Primer pop retorna C (prioridad 15)');
assert(first?.priority === 15, 'Prioridad del primer pop es 15');

const second = heap.pop();
assert(second?.orderId === 'A', 'Segundo pop retorna A (prioridad 10)');

const third = heap.pop();
assert(third?.orderId === 'D', 'Tercer pop retorna D (prioridad 8)');

const fourth = heap.pop();
assert(fourth?.orderId === 'B', 'Cuarto pop retorna B (prioridad 5)');

assert(heap.isEmpty(), 'Heap vacío después de popping todo');

// Test 4: Remove por orderId
heap.push({ orderId: 'X', priority: 20, createdAt: new Date() });
heap.push({ orderId: 'Y', priority: 30, createdAt: new Date() });
heap.push({ orderId: 'Z', priority: 25, createdAt: new Date() });

heap.remove('Y');
assert(heap.size() === 2, 'Tamaño es 2 después de remover Y');
assert(heap.peek()?.orderId === 'Z', 'Nuevo top es Z (25) después de remover Y');

heap.remove('X');
assert(heap.peek()?.orderId === 'Z', 'Top sigue siendo Z después de remover X');

heap.remove('Z');
assert(heap.isEmpty(), 'Heap vacío después de remover todos');

// Test 5: Remove elemento inexistente (no debe fallar)
heap.push({ orderId: 'W', priority: 10, createdAt: new Date() });
heap.remove('NONEXISTENT');
assert(heap.size() === 1, 'Remove de inexistente no afecta el heap');

// Test 6: toArray retorna ordenado descendente
heap.push({ orderId: 'P', priority: 50, createdAt: new Date() });
heap.push({ orderId: 'Q', priority: 40, createdAt: new Date() });
const arr = heap.toArray();
assert(arr[0].priority === 50, 'toArray()[0] es el de mayor prioridad');
assert(arr[1].priority === 40, 'toArray()[1] es el segundo');
assert(arr[2].priority === 10, 'toArray()[2] es el menor');

// Test 7: Caso del issue - órdenes con misma prioridad
// Orden A: Stripe, usuario nuevo, 0 dias -> 10 + 0 + 0 = 10
// Orden B: COD, usuario con 10 ordenes, 2 dias -> 5 + 2 + 2 = 9
// Orden C: COD, usuario nuevo, 6 dias -> 5 + 0 + 5 = 10
// Orden D: Stripe, usuario con 20 ordenes, 1 dia -> 10 + 4 + 1 = 15
const heapIssue = new MaxHeap();
const now = new Date();
const sixDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);

heapIssue.push({ orderId: 'A', priority: 10, createdAt: now });
heapIssue.push({ orderId: 'B', priority: 9, createdAt: twoDaysAgo });
heapIssue.push({ orderId: 'C', priority: 10, createdAt: sixDaysAgo });
heapIssue.push({ orderId: 'D', priority: 15, createdAt: oneDayAgo });

const order1 = heapIssue.pop();
const order2 = heapIssue.pop();
const order3 = heapIssue.pop();
const order4 = heapIssue.pop();

assert(order1?.orderId === 'D', 'Issue: D (15) es primera');
assert(order2?.orderId === 'A', 'Issue: A (10) es segunda');
assert(order3?.orderId === 'C', 'Issue: C (10) es tercera');
assert(order4?.orderId === 'B', 'Issue: B (9) es cuarta');

console.log('\n🎉 Todas las pruebas del MaxHeap pasaron correctamente.');