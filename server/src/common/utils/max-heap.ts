interface HeapNode {
    orderId: string;
    priority: number;
    createdAt: Date;
}

export class MaxHeap {
    private heap: HeapNode[] = [];

    isEmpty(): boolean {
        return this.heap.length === 0;
    }

    size(): number {
        return this.heap.length;
    }

    peek(): HeapNode | null {
        return this.isEmpty() ? null : this.heap[0];
    }

    push(node: HeapNode): void {
        this.heap.push(node);
        this.bubbleUp(this.heap.length - 1);
    }

    pop(): HeapNode | null {
        if (this.isEmpty()) return null;
        const top = this.heap[0];
        const bottom = this.heap.pop()!;
        if (!this.isEmpty()) {
            this.heap[0] = bottom;
            this.sinkDown(0);
        }
        return top;
    }

    remove(orderId: string): void {
        const idx = this.heap.findIndex(n => n.orderId === orderId);
        if (idx === -1) return;
        // Si es el último elemento, simplemente pop
        if (idx === this.heap.length - 1) {
            this.heap.pop();
            return;
        }
        // Reemplazar con el último y restaurar propiedad de heap
        this.heap[idx] = this.heap.pop()!;
        const parentIdx = Math.floor((idx - 1) / 2);
        // Un elemento solo puede necesitar subir O bajar, no ambas
        if (idx > 0 && this.heap[idx].priority > this.heap[parentIdx].priority) {
            this.bubbleUp(idx);
        } else {
            this.sinkDown(idx);
        }
    }

    toArray(): HeapNode[] {
        return [...this.heap].sort((a, b) => b.priority - a.priority);
    }

    private bubbleUp(idx: number): void {
        while (idx > 0) {
            const parent = Math.floor((idx - 1) / 2);
            if (this.heap[parent].priority >= this.heap[idx].priority) break;
            [this.heap[parent], this.heap[idx]] = [this.heap[idx], this.heap[parent]];
            idx = parent;
        }
    }

    private sinkDown(idx: number): void {
        const last = this.heap.length - 1;
        while (true) {
            let maxIdx = idx;
            const left = 2 * idx + 1;
            const right = 2 * idx + 2;
            if (left <= last && this.heap[left].priority > this.heap[maxIdx].priority) maxIdx = left;
            if (right <= last && this.heap[right].priority > this.heap[maxIdx].priority) maxIdx = right;
            if (maxIdx === idx) break;
            [this.heap[idx], this.heap[maxIdx]] = [this.heap[maxIdx], this.heap[idx]];
            idx = maxIdx;
        }
    }
}

export type { HeapNode };