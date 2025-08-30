import React from "react";

export interface LayerConfig {
  name: string;
  visible: boolean;
  opacity: number;
  zIndex: number;
  locked?: boolean;
  color?: string;
  description?: string;
}

export type LayerElement = {
  layerName: string;
  element: React.ReactNode;
  id: string;
};

export class LayerManager {
  private layers: Map<string, LayerConfig> = new Map();
  private defaultLayers: LayerConfig[] = [
    { name: 'background', visible: true, opacity: 1, zIndex: 0, description: 'Background elements' },
    { name: 'grid', visible: true, opacity: 0.5, zIndex: 1, description: 'Grid lines' },
    { name: 'edges', visible: true, opacity: 1, zIndex: 10, description: 'Connection lines' },
    { name: 'nodes', visible: true, opacity: 1, zIndex: 20, description: 'Node components' },
    { name: 'connectors', visible: true, opacity: 1, zIndex: 21, description: 'Port connectors' },
    { name: 'selection', visible: true, opacity: 0.8, zIndex: 30, description: 'Selection indicators' },
    { name: 'overlay', visible: true, opacity: 1, zIndex: 40, description: 'UI overlays' },
    { name: 'debug', visible: false, opacity: 0.7, zIndex: 50, description: 'Debug information' },
  ];
  
  constructor(customLayers?: LayerConfig[]) {
    // Initialize with default layers
    this.defaultLayers.forEach(layer => {
      this.layers.set(layer.name, { ...layer });
    });
    
    // Add custom layers
    if (customLayers) {
      customLayers.forEach(layer => {
        this.layers.set(layer.name, { ...layer });
      });
    }
  }
  
  // Layer management methods
  addLayer(config: LayerConfig): void {
    this.layers.set(config.name, { ...config });
  }
  
  removeLayer(name: string): boolean {
    return this.layers.delete(name);
  }
  
  getLayer(name: string): LayerConfig | undefined {
    return this.layers.get(name);
  }
  
  getAllLayers(): LayerConfig[] {
    return Array.from(this.layers.values()).sort((a, b) => a.zIndex - b.zIndex);
  }
  
  getVisibleLayers(): LayerConfig[] {
    return this.getAllLayers().filter(layer => layer.visible);
  }
  
  // Layer property updates
  setVisible(name: string, visible: boolean): void {
    const layer = this.layers.get(name);
    if (layer) {
      layer.visible = visible;
    }
  }
  
  setOpacity(name: string, opacity: number): void {
    const layer = this.layers.get(name);
    if (layer) {
      layer.opacity = Math.max(0, Math.min(1, opacity));
    }
  }
  
  setZIndex(name: string, zIndex: number): void {
    const layer = this.layers.get(name);
    if (layer) {
      layer.zIndex = zIndex;
    }
  }
  
  setLocked(name: string, locked: boolean): void {
    const layer = this.layers.get(name);
    if (layer) {
      layer.locked = locked;
    }
  }
  
  // Utility methods
  isVisible(name: string): boolean {
    const layer = this.layers.get(name);
    return layer?.visible ?? false;
  }
  
  isLocked(name: string): boolean {
    const layer = this.layers.get(name);
    return layer?.locked ?? false;
  }
  
  getOpacity(name: string): number {
    const layer = this.layers.get(name);
    return layer?.opacity ?? 1;
  }
  
  // Export/import configuration
  exportConfig(): Record<string, LayerConfig> {
    const config: Record<string, LayerConfig> = {};
    this.layers.forEach((layer, name) => {
      config[name] = { ...layer };
    });
    return config;
  }
  
  importConfig(config: Record<string, LayerConfig>): void {
    Object.keys(config).forEach(name => {
      this.layers.set(name, { ...config[name] });
    });
  }
}

// Hook for using layers in React components
export function useLayers(initialLayers?: LayerConfig[]) {
  const [layerManager] = React.useState(() => new LayerManager(initialLayers));
  const [, forceUpdate] = React.useReducer((x: number) => x + 1, 0);
  
  // Create methods that trigger re-renders
  const methods = React.useMemo(() => ({
    setVisible: (name: string, visible: boolean) => {
      layerManager.setVisible(name, visible);
      forceUpdate();
    },
    setOpacity: (name: string, opacity: number) => {
      layerManager.setOpacity(name, opacity);
      forceUpdate();
    },
    setZIndex: (name: string, zIndex: number) => {
      layerManager.setZIndex(name, zIndex);
      forceUpdate();
    },
    setLocked: (name: string, locked: boolean) => {
      layerManager.setLocked(name, locked);
      forceUpdate();
    },
    addLayer: (config: LayerConfig) => {
      layerManager.addLayer(config);
      forceUpdate();
    },
    removeLayer: (name: string) => {
      layerManager.removeLayer(name);
      forceUpdate();
    },
  }), [layerManager]);
  
  return {
    layers: layerManager.getAllLayers(),
    visibleLayers: layerManager.getVisibleLayers(),
    getLayer: layerManager.getLayer.bind(layerManager),
    isVisible: layerManager.isVisible.bind(layerManager),
    isLocked: layerManager.isLocked.bind(layerManager),
    getOpacity: layerManager.getOpacity.bind(layerManager),
    ...methods,
  };
}