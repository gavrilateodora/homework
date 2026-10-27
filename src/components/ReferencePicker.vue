<template>
  <div class="reference-picker">
    <p v-if="!groups.length" class="empty">
      No outputs available. Only steps that always run before this one can be
      used.
    </p>

    <div v-for="group in groups" :key="group.step.id" class="group">
      <div class="group-title">
        <catnip-icon
          .name="getStepIcon(group.step.type)"
          size="20"
        ></catnip-icon>
        <span>{{ group.step.displayName }}</span>
      </div>
      <catnip-button
        v-for="(output, index) in group.outputs"
        :key="index"
        appearance="ghost"
        size="s"
        class="option"
        @click="emit('select', makeReference(group.step.id, output.key))"
      >
        {{ output.label }}
      </catnip-button>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useEditorStore } from "@/store/editor.js";
import { getAvailableSteps } from "@/logic/graph.js";
import { getStepIcon, getStepOutputs } from "@/logic/stepTypes.js";
import { makeReference } from "@/logic/references.js";

const props = defineProps({
  /** The step that will receive the reference. */
  stepId: { type: String, required: true },
});

const emit = defineEmits(["select"]);

const editor = useEditorStore();

const groups = computed(() =>
  getAvailableSteps(editor.tree, props.stepId)
    .map((step) => ({
      step,
      outputs: getStepOutputs(step).filter((output) => output.key),
    }))
    .filter((group) => group.outputs.length > 0),
);
</script>

<style scoped lang="scss">
.reference-picker {
  margin-top: var(--catnip-space-2);
}

.group {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  margin-bottom: var(--catnip-space-3);
}

.group-title {
  display: flex;
  align-items: center;
  gap: var(--catnip-space-2);
  font: var(--catnip-font-text-s);
  font-weight: 600;
  color: var(--catnip-color-content-neutral-subtle);
}

.empty {
  font: var(--catnip-font-text-s);
  color: var(--catnip-color-content-neutral-subtle);
}
</style>
