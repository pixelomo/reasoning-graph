<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useGraphStore } from '@/stores/graph-store'

const store = useGraphStore()
const { selectedNode } = storeToRefs(store)
</script>

<template>
  <section class="inspector">
    <h2>Selection</h2>

    <p v-if="!selectedNode" class="empty">No node selected.</p>

    <dl v-else class="details">
      <dt>ID</dt>
      <dd>{{ selectedNode.id }}</dd>

      <dt>Kind</dt>
      <dd>{{ selectedNode.kind }}</dd>

      <template v-if="selectedNode.kind === 'concept'">
        <dt>Label</dt>
        <dd>{{ selectedNode.label }}</dd>
        <dt>Weight</dt>
        <dd>{{ selectedNode.weight.toFixed(3) }}</dd>
      </template>

      <template v-else-if="selectedNode.kind === 'rule'">
        <dt>Premise</dt>
        <dd>{{ selectedNode.premise.join(', ') }}</dd>
        <dt>Conclusion</dt>
        <dd>{{ selectedNode.conclusion }}</dd>
      </template>

      <template v-else>
        <dt>From</dt>
        <dd>{{ selectedNode.from }}</dd>
        <dt>To</dt>
        <dd>{{ selectedNode.to }}</dd>
        <dt>Strength</dt>
        <dd>{{ selectedNode.strength.toFixed(3) }}</dd>
      </template>
    </dl>

    <button v-if="selectedNode" type="button" class="clear" @click="store.clearSelection()">
      Clear selection
    </button>
  </section>
</template>

<style scoped>
.inspector {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

h2 {
  margin: 0;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #8b93a7;
}

.empty {
  margin: 0;
  font-size: 13px;
  color: #6b7280;
}

.details {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 6px 14px;
  margin: 0;
  font-size: 13px;
}

dt {
  color: #8b93a7;
}

dd {
  margin: 0;
  color: #e6e9f0;
  word-break: break-word;
}

.clear {
  align-self: flex-start;
  padding: 6px 10px;
  border: 1px solid #2a2f3d;
  border-radius: 8px;
  background: #161a24;
  color: #e6e9f0;
  font-size: 12px;
  cursor: pointer;
}
</style>
