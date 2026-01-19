/**
 * @fileoverview Circuit Breaker
 * @fileoverview 熔断器
 *
 * Redis-backed distributed circuit breaker for provider fault tolerance.
 * 基于 Redis 的分布式熔断器，用于供应商容错。
 *
 * @module @magiworld/queue/circuit-breaker
 */

import { getRedis } from './redis';
import type { CircuitState } from './types';

/**
 * Circuit breaker configuration
 * 熔断器配置
 */
export interface CircuitBreakerOptions {
  /** Failure threshold to open circuit / 打开熔断的失败阈值 */
  failureThreshold: number;
  /** Time in ms to wait before trying half-open / 尝试半开状态前等待的时间（毫秒）*/
  resetTimeout: number;
  /** TTL for Redis keys in seconds / Redis 键的 TTL（秒）*/
  keyTtl: number;
}

/**
 * Default circuit breaker options
 * 默认熔断器选项
 */
const DEFAULT_OPTIONS: CircuitBreakerOptions = {
  failureThreshold: 5,
  resetTimeout: 30000, // 30 seconds
  keyTtl: 3600, // 1 hour
};

/**
 * Redis key prefix for circuit breaker
 * 熔断器的 Redis 键前缀
 */
const CIRCUIT_KEY_PREFIX = 'circuit:';

/**
 * Get Redis keys for a provider's circuit breaker
 * 获取供应商熔断器的 Redis 键
 */
function getCircuitKeys(providerId: string) {
  return {
    state: `${CIRCUIT_KEY_PREFIX}${providerId}:state`,
    failures: `${CIRCUIT_KEY_PREFIX}${providerId}:failures`,
    openedAt: `${CIRCUIT_KEY_PREFIX}${providerId}:opened_at`,
  };
}

/**
 * Circuit breaker for provider fault tolerance
 * 用于供应商容错的熔断器
 */
export class CircuitBreaker {
  private providerId: string;
  private options: CircuitBreakerOptions;

  constructor(providerId: string, options: Partial<CircuitBreakerOptions> = {}) {
    this.providerId = providerId;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Get current circuit state
   * 获取当前熔断状态
   */
  async getState(): Promise<CircuitState> {
    const redis = getRedis();
    const keys = getCircuitKeys(this.providerId);

    const state = await redis.get(keys.state);
    if (!state) return 'closed';

    // Check if we should transition from open to half-open
    if (state === 'open') {
      const openedAtStr = await redis.get(keys.openedAt);
      if (openedAtStr) {
        const openedAt = parseInt(openedAtStr, 10);
        const elapsed = Date.now() - openedAt;

        if (elapsed >= this.options.resetTimeout) {
          // Transition to half-open
          await this.setState('half-open');
          return 'half-open';
        }
      }
    }

    return state as CircuitState;
  }

  /**
   * Set circuit state
   * 设置熔断状态
   */
  private async setState(state: CircuitState): Promise<void> {
    const redis = getRedis();
    const keys = getCircuitKeys(this.providerId);

    await redis.set(keys.state, state, 'EX', this.options.keyTtl);

    if (state === 'open') {
      await redis.set(keys.openedAt, Date.now().toString(), 'EX', this.options.keyTtl);
    }
  }

  /**
   * Get current failure count
   * 获取当前失败计数
   */
  async getFailureCount(): Promise<number> {
    const redis = getRedis();
    const keys = getCircuitKeys(this.providerId);

    const count = await redis.get(keys.failures);
    return count ? parseInt(count, 10) : 0;
  }

  /**
   * Check if circuit allows requests
   * 检查熔断器是否允许请求
   */
  async canExecute(): Promise<boolean> {
    const state = await this.getState();

    switch (state) {
      case 'closed':
        return true;
      case 'half-open':
        return true; // Allow one test request
      case 'open':
        return false;
      default:
        return true;
    }
  }

  /**
   * Record a successful execution
   * 记录成功的执行
   */
  async onSuccess(): Promise<void> {
    const redis = getRedis();
    const keys = getCircuitKeys(this.providerId);
    const state = await this.getState();

    // Reset on success
    await redis.set(keys.failures, '0', 'EX', this.options.keyTtl);

    if (state === 'half-open' || state === 'open') {
      await this.setState('closed');
      console.log(`[CircuitBreaker] ${this.providerId}: Circuit CLOSED (recovered)`);
    }
  }

  /**
   * Record a failed execution
   * 记录失败的执行
   */
  async onFailure(): Promise<void> {
    const redis = getRedis();
    const keys = getCircuitKeys(this.providerId);
    const state = await this.getState();

    // If half-open and failed, go back to open
    if (state === 'half-open') {
      await this.setState('open');
      console.log(`[CircuitBreaker] ${this.providerId}: Circuit OPEN (half-open test failed)`);
      return;
    }

    // Increment failure count
    const failures = await redis.incr(keys.failures);
    await redis.expire(keys.failures, this.options.keyTtl);

    // Check if we need to open the circuit
    if (failures >= this.options.failureThreshold) {
      await this.setState('open');
      console.log(
        `[CircuitBreaker] ${this.providerId}: Circuit OPEN (${failures} failures)`
      );
    }
  }

  /**
   * Execute a function with circuit breaker protection
   * 使用熔断器保护执行函数
   *
   * @param fn - Function to execute / 要执行的函数
   * @returns Function result / 函数结果
   * @throws Error if circuit is open / 如果熔断器打开则抛出错误
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const canExecute = await this.canExecute();

    if (!canExecute) {
      throw new CircuitBreakerOpenError(
        `Circuit breaker is OPEN for provider: ${this.providerId}`
      );
    }

    try {
      const result = await fn();
      await this.onSuccess();
      return result;
    } catch (error) {
      await this.onFailure();
      throw error;
    }
  }

  /**
   * Manually reset the circuit breaker
   * 手动重置熔断器
   */
  async reset(): Promise<void> {
    const redis = getRedis();
    const keys = getCircuitKeys(this.providerId);

    await redis.del(keys.state, keys.failures, keys.openedAt);
    console.log(`[CircuitBreaker] ${this.providerId}: Circuit RESET`);
  }
}

/**
 * Error thrown when circuit breaker is open
 * 熔断器打开时抛出的错误
 */
export class CircuitBreakerOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitBreakerOpenError';
  }
}

/**
 * Get or create a circuit breaker for a provider
 * 获取或创建供应商的熔断器
 */
const circuitBreakers = new Map<string, CircuitBreaker>();

export function getCircuitBreaker(
  providerId: string,
  options?: Partial<CircuitBreakerOptions>
): CircuitBreaker {
  const key = providerId;
  let breaker = circuitBreakers.get(key);

  if (!breaker) {
    breaker = new CircuitBreaker(providerId, options);
    circuitBreakers.set(key, breaker);
  }

  return breaker;
}
