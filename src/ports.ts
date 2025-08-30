export type PortType = 'electrical' | 'data' | 'mechanical' | 'optical' | 'custom';
export type PortDirection = 'input' | 'output' | 'bidirectional';
export type ConnectionType = 'wire' | 'bus' | 'trace' | 'fiber' | 'mechanical' | 'custom';

export interface PortProperties {
  // Electrical properties
  voltage?: number;
  current?: number;
  power?: number;
  
  // Data properties
  dataType?: string;
  bitWidth?: number;
  frequency?: number;
  
  // Mechanical properties
  force?: number;
  torque?: number;
  
  // Custom properties
  [key: string]: any;
}

export interface Port {
  id: string;
  type: PortType;
  direction: PortDirection;
  position: { x: number; y: number };
  properties?: PortProperties;
  
  // Visual properties
  shape?: 'circle' | 'square' | 'diamond' | 'triangle';
  size?: number;
  color?: string;
  
  // Connection constraints
  maxConnections?: number;
  allowedConnectionTypes?: ConnectionType[];
  
  // Metadata
  label?: string;
  description?: string;
}

export interface Connection {
  id: string;
  type: ConnectionType;
  source: { nodeId: string; portId: string };
  target: { nodeId: string; portId: string };
  
  // Visual properties
  style?: {
    stroke?: string;
    strokeWidth?: number;
    strokeDasharray?: string;
    opacity?: number;
  };
  
  // Connection properties
  properties?: {
    // Signal properties
    signalName?: string;
    netName?: string;
    
    // Physical properties
    length?: number;
    resistance?: number;
    capacitance?: number;
    inductance?: number;
    
    // Custom properties
    [key: string]: any;
  };
}

export interface ConnectionRule {
  name: string;
  description: string;
  validate: (sourcePort: Port, targetPort: Port, connection?: Partial<Connection>) => {
    valid: boolean;
    message?: string;
    severity?: 'error' | 'warning';
  };
}

// Built-in connection rules
export const defaultConnectionRules: ConnectionRule[] = [
  {
    name: 'port-type-compatibility',
    description: 'Source and target ports must be compatible types',
    validate: (source, target) => {
      if (source.type === target.type) {
        return { valid: true };
      }
      
      // Allow some cross-type connections
      const compatiblePairs = [
        ['electrical', 'data'],
        ['data', 'electrical'],
      ];
      
      const isCompatible = compatiblePairs.some(
        pair => (pair[0] === source.type && pair[1] === target.type)
      );
      
      return {
        valid: isCompatible,
        message: isCompatible ? undefined : `Cannot connect ${source.type} to ${target.type}`,
        severity: 'error' as const,
      };
    },
  },
  
  {
    name: 'direction-compatibility',
    description: 'Connection direction must be valid',
    validate: (source, target) => {
      // Output to input is always valid
      if (source.direction === 'output' && target.direction === 'input') {
        return { valid: true };
      }
      
      // Bidirectional can connect to anything
      if (source.direction === 'bidirectional' || target.direction === 'bidirectional') {
        return { valid: true };
      }
      
      // Input to output is not allowed
      if (source.direction === 'input' && target.direction === 'output') {
        return {
          valid: false,
          message: 'Cannot connect input to output',
          severity: 'error' as const,
        };
      }
      
      // Same direction connections might be warnings
      if (source.direction === target.direction) {
        return {
          valid: true,
          message: `Connecting ${source.direction} to ${target.direction}`,
          severity: 'warning' as const,
        };
      }
      
      return { valid: true };
    },
  },
  
  {
    name: 'max-connections',
    description: 'Port cannot exceed maximum connections',
    validate: (source, target, _connection) => {
      // This would need access to existing connections to validate properly
      // For now, just check if maxConnections is set
      if (source.maxConnections !== undefined && source.maxConnections <= 1) {
        return {
          valid: true,
          message: 'Source port allows limited connections',
          severity: 'warning' as const,
        };
      }
      
      if (target.maxConnections !== undefined && target.maxConnections <= 1) {
        return {
          valid: true,
          message: 'Target port allows limited connections',
          severity: 'warning' as const,
        };
      }
      
      return { valid: true };
    },
  },
  
  {
    name: 'voltage-compatibility',
    description: 'Electrical ports should have compatible voltages',
    validate: (source, target) => {
      if (source.type !== 'electrical' || target.type !== 'electrical') {
        return { valid: true };
      }
      
      const sourceVoltage = source.properties?.voltage;
      const targetVoltage = target.properties?.voltage;
      
      if (sourceVoltage !== undefined && targetVoltage !== undefined) {
        const voltageDiff = Math.abs(sourceVoltage - targetVoltage);
        
        if (voltageDiff > 0.1) {
          return {
            valid: true,
            message: `Voltage mismatch: ${sourceVoltage}V to ${targetVoltage}V`,
            severity: 'warning' as const,
          };
        }
      }
      
      return { valid: true };
    },
  },
];

export class ConnectionValidator {
  private rules: ConnectionRule[];
  
  constructor(rules: ConnectionRule[] = defaultConnectionRules) {
    this.rules = rules;
  }
  
  addRule(rule: ConnectionRule) {
    this.rules.push(rule);
  }
  
  removeRule(name: string) {
    this.rules = this.rules.filter(rule => rule.name !== name);
  }
  
  validate(sourcePort: Port, targetPort: Port, connection?: Partial<Connection>) {
    const results = this.rules.map(rule => ({
      rule: rule.name,
      ...rule.validate(sourcePort, targetPort, connection),
    }));
    
    const errors = results.filter(r => !r.valid);
    const warnings = results.filter(r => r.valid && r.severity === 'warning');
    
    return {
      valid: errors.length === 0,
      errors: errors.map(e => ({ rule: e.rule, message: e.message })),
      warnings: warnings.map(w => ({ rule: w.rule, message: w.message })),
    };
  }
}

// Utility functions for port management
export function createPort(
  id: string, 
  type: PortType, 
  direction: PortDirection, 
  position: { x: number; y: number },
  options?: Partial<Omit<Port, 'id' | 'type' | 'direction' | 'position'>>
): Port {
  return {
    id,
    type,
    direction,
    position,
    shape: 'circle',
    size: 4,
    color: getDefaultPortColor(type, direction),
    ...options,
  };
}

export function getDefaultPortColor(type: PortType, direction: PortDirection): string {
  const colorMap: Record<PortType, Record<PortDirection, string>> = {
    electrical: {
      input: '#ff6b6b',
      output: '#4ecdc4',
      bidirectional: '#45b7d1',
    },
    data: {
      input: '#96ceb4',
      output: '#feca57',
      bidirectional: '#ff9ff3',
    },
    mechanical: {
      input: '#74b9ff',
      output: '#fd79a8',
      bidirectional: '#fdcb6e',
    },
    optical: {
      input: '#a29bfe',
      output: '#fd79a8',
      bidirectional: '#e17055',
    },
    custom: {
      input: '#636e72',
      output: '#636e72',
      bidirectional: '#636e72',
    },
  };
  
  return colorMap[type]?.[direction] || '#636e72';
}

export function createConnection(
  id: string,
  type: ConnectionType,
  source: { nodeId: string; portId: string },
  target: { nodeId: string; portId: string },
  options?: Partial<Omit<Connection, 'id' | 'type' | 'source' | 'target'>>
): Connection {
  return {
    id,
    type,
    source,
    target,
    style: {
      stroke: getDefaultConnectionColor(type),
      strokeWidth: getDefaultConnectionWidth(type),
      ...options?.style,
    },
    ...options,
  };
}

export function getDefaultConnectionColor(type: ConnectionType): string {
  const colorMap: Record<ConnectionType, string> = {
    wire: '#2d3436',
    bus: '#0984e3',
    trace: '#00b894',
    fiber: '#e17055',
    mechanical: '#74b9ff',
    custom: '#636e72',
  };
  
  return colorMap[type] || '#636e72';
}

export function getDefaultConnectionWidth(type: ConnectionType): number {
  const widthMap: Record<ConnectionType, number> = {
    wire: 1,
    bus: 3,
    trace: 1.5,
    fiber: 2,
    mechanical: 2,
    custom: 1,
  };
  
  return widthMap[type] || 1;
}