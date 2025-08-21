import { DecisionNode, DecisionTrace } from './types';

/**
 * Print a decision tree to console for debugging
 * @param node - Root node to print
 * @param indent - Current indentation level
 */
export function printDecisionTree(node: DecisionNode, indent: string = ''): void {
  console.log(`${indent}${node.type}: ${node.description}`);
  
  if (node.result !== undefined) {
    console.log(`${indent}  → Result: ${JSON.stringify(node.result)}`);
  }
  
  if (node.metadata?.error) {
    console.log(`${indent}  ❌ Error: ${node.metadata.error}`);
  }
  
  if (node.metadata?.duration_ms !== undefined) {
    console.log(`${indent}  ⏱️ Duration: ${node.metadata.duration_ms}ms`);
  }
  
  if (node.metadata?.rule_name) {
    console.log(`${indent}  📋 Rule: ${node.metadata.rule_name}`);
  }
  
  if (node.metadata?.confidence !== undefined) {
    console.log(`${indent}  🎯 Confidence: ${(node.metadata.confidence * 100).toFixed(1)}%`);
  }
  
  node.children.forEach(child => {
    printDecisionTree(child, indent + '  ');
  });
}

/**
 * Convert a decision trace to Mermaid flowchart format
 * @param trace - Decision trace to convert
 * @returns Mermaid flowchart string
 */
export function toMermaidFlowchart(trace: DecisionTrace): string {
  const lines: string[] = ['flowchart TD'];
  
  const processNode = (node: DecisionNode, parentId?: string) => {
    const nodeLabel = `${node.description}`;
    const nodeShape = getNodeShape(node.type);
    
    lines.push(`    ${node.id}${nodeShape[0]}${nodeLabel}${nodeShape[1]}`);
    
    if (parentId) {
      lines.push(`    ${parentId} --> ${node.id}`);
    }
    
    if (node.metadata?.error) {
      lines.push(`    ${node.id} -.-> ${node.id}_error["❌ ${node.metadata.error}"]`);
      lines.push(`    ${node.id}_error:::error`);
    }
    
    node.children.forEach(child => processNode(child, node.id));
  };
  
  processNode(trace.rootDecision);
  
  lines.push('    classDef error fill:#ffebee,stroke:#f44336');
  lines.push('    classDef condition fill:#e3f2fd,stroke:#2196f3');
  lines.push('    classDef action fill:#e8f5e8,stroke:#4caf50');
  lines.push('    classDef api_call fill:#fff3e0,stroke:#ff9800');
  
  return lines.join('\n');
}

function getNodeShape(type: DecisionNode['type']): [string, string] {
  switch (type) {
    case 'condition': return ['{"', '"}'];
    case 'action': return ['["', '"]'];
    case 'api_call': return ['(("', '"))'];
    case 'data_lookup': return ['[("', '")]'];
    case 'rule_evaluation': return ['[/"', '"/]'];
    default: return ['["', '"]'];
  }
}