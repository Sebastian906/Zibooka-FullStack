import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument } from '../schemas/order.schema';
import { User, UserDocument } from 'src/users/schemas/user.schema';
import { MaxHeap, HeapNode } from 'src/common/utils/max-heap';

@Injectable()
export class OrderSchedulerService implements OnModuleInit {
    private readonly logger = new Logger(OrderSchedulerService.name);
    private readonly heap = new MaxHeap();

    // Pesos para el cálculo de prioridad
    private static readonly PAYMENT_WEIGHTS = { stripe: 10, cod: 5 };
    private static readonly HISTORY_DIVISOR = 5;
    private static readonly HISTORY_MAX = 5;
    private static readonly AGE_MAX = 5;

    constructor(
        @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
        @InjectModel(User.name) private userModel: Model<UserDocument>,
    ) { }

    /**
     * Reconstruye la cola al iniciar el servidor con órdenes pendientes.
     */
    async onModuleInit(): Promise<void> {
        await this.rebuildQueue();
    }

    /**
     * Calcula la prioridad de una orden.
     * priority = paymentScore + historyScore + ageScore
     */
    async calculatePriority(orderId: string): Promise<number> {
        const order = await this.orderModel.findById(orderId).lean();
        if (!order) return 0;

        // paymentScore: Stripe = 10, COD = 5
        const paymentScore = order.paymentMethod === 'stripe'
            ? OrderSchedulerService.PAYMENT_WEIGHTS.stripe
            : OrderSchedulerService.PAYMENT_WEIGHTS.cod;

        // historyScore: min(completedOrders / 5, 5)
        const user = await this.userModel.findById(order.userId).lean();
        const completedOrders = (user as any)?.completedOrders ?? 0;
        const historyScore = Math.min(
            completedOrders / OrderSchedulerService.HISTORY_DIVISOR,
            OrderSchedulerService.HISTORY_MAX,
        );

        // ageScore: min(dias_desde_creacion, 5)
        const now = new Date();
        const created = new Date(order.createdAt);
        const diffMs = now.getTime() - created.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        const ageScore = Math.min(diffDays, OrderSchedulerService.AGE_MAX);

        return paymentScore + historyScore + ageScore;
    }

    /**
     * Agrega una orden a la cola de prioridad.
     */
    async enqueueOrder(orderId: string): Promise<void> {
        const priority = await this.calculatePriority(orderId);
        const order = await this.orderModel.findById(orderId).lean();
        if (!order) {
            this.logger.warn(`Cannot enqueue order ${orderId}: not found`);
            return;
        }

        // Si ya está en la cola, removerla primero (re-enqueue con prioridad actualizada)
        this.heap.remove(orderId);

        const node: HeapNode = {
            orderId,
            priority,
            createdAt: new Date(order.createdAt),
        };
        this.heap.push(node);
        this.logger.log(`Order ${orderId} enqueued with priority ${priority}`);
    }

    /**
     * Obtiene la siguiente orden a procesar (mayor prioridad).
     */
    getNextOrder(): HeapNode | null {
        return this.heap.pop();
    }

    /**
     * Remueve una orden de la cola (al completar o cancelar).
     */
    completeOrder(orderId: string): void {
        this.heap.remove(orderId);
        this.logger.log(`Order ${orderId} removed from queue`);
    }

    /**
     * Recalcula prioridades de toda la cola.
     */
    async rebalanceQueue(): Promise<void> {
        const nodes = this.heap.toArray();
        this.heap['heap'] = []; // Limpiar el heap interno

        for (const node of nodes) {
            const newPriority = await this.calculatePriority(node.orderId);
            this.heap.push({
                ...node,
                priority: newPriority,
            });
        }
        this.logger.log(`Queue rebalanced: ${nodes.length} orders`);
    }

    /**
     * Procesa las N órdenes de mayor prioridad.
     */
    async processNextBatch(
        batchSize: number,
    ): Promise<Array<{ orderId: string; priority: number }>> {
        const processed: Array<{ orderId: string; priority: number }> = [];

        for (let i = 0; i < batchSize; i++) {
            const node = this.getNextOrder();
            if (!node) break;

            // Actualizar estado de la orden a 'Processing'
            await this.orderModel.findByIdAndUpdate(node.orderId, {
                status: 'Processing',
            });

            processed.push({ orderId: node.orderId, priority: node.priority });
            this.logger.log(
                `Processed order ${node.orderId} with priority ${node.priority}`,
            );
        }

        return processed;
    }

    /**
     * Reconstruye la cola desde la base de datos.
     */
    async rebuildQueue(): Promise<void> {
        this.logger.log('Rebuilding order queue from database...');

        const pendingOrders = await this.orderModel
            .find({ status: 'Order Placed' })
            .lean();

        this.heap['heap'] = []; // Limpiar

        for (const order of pendingOrders) {
            const priority = await this.calculatePriority(order._id.toString());
            this.heap.push({
                orderId: order._id.toString(),
                priority,
                createdAt: new Date(order.createdAt),
            });
        }

        this.logger.log(
            `Queue rebuilt with ${pendingOrders.length} pending orders`,
        );
    }

    /**
     * Obtiene el estado actual de la cola (para endpoint admin).
     */
    getQueueStatus(): Array<{
        orderId: string;
        priority: number;
        createdAt: Date;
    }> {
        return this.heap.toArray();
    }

    /**
     * Obtiene el tamaño de la cola.
     */
    getQueueSize(): number {
        return this.heap.size();
    }
}