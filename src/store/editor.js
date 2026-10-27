import { defineStore } from "pinia";
import { api } from "@/api";
import { buildTree, canRemoveStep, getStep, insertStep, removeStep } from "@/logic/graph.js";
import { STEP_TYPES } from "@/logic/stepTypes.js";
import { useFlowsStore } from "./flows.js";
import { useUiStore } from "./ui.js";
import { findStepsUsing } from "@/logic/references.js";

export const useEditorStore = defineStore("editor", {
  state: () => ({
    activeFlowId: null,
    flow: null,
    original: null,
    loading: false,
    saving: false,
    selectedStepId: null
  }),

  getters: {
    tree: (state) => (state.flow ? buildTree(state.flow) : []),
    selectedStep: (state) => (state.flow && state.selectedStepId ? getStep(state.flow, state.selectedStepId) : null),
    isDirty: (state) => !!state.flow && JSON.stringify(state.flow) !== JSON.stringify(state.original)
  },

  actions: {
    async openFlow(flowId) {
      if (flowId === this.activeFlowId) return;
      if (this.isDirty && !window.confirm("You have unsaved changes. Discard them?")) return;

      this.activeFlowId = flowId;
      this.selectedStepId = null;
      this.loading = true;
      try {
        const flow = await api.getFlow(flowId);
        if (this.activeFlowId !== flowId) return;

        this.flow = flow;
        this.original = JSON.parse(JSON.stringify(flow));
        this.unsubscribe?.();
        this.unsubscribe = api.subscribe(flowId, (event) => this.handleRealtimeEvent(event));
      } catch (error) {
        if (this.activeFlowId !== flowId) return;
        useUiStore().notify({ intent: "danger", text: `Could not load flow: ${error.message}` });
      } finally {
        if (this.activeFlowId === flowId) this.loading = false;
      }
    },

    async save() {
      if (!this.flow) return;
      this.saving = true;
      try {
        const saved = await api.saveFlow(this.activeFlowId, this.flow);
        this.flow = saved;
        this.original = saved;
        useUiStore().notify({ intent: "success", text: "Flow saved" });
        useFlowsStore().fetchFlows();
      } catch (error) {
        useUiStore().notify({ intent: "danger", text: `Save failed: ${error.message}` });
      } finally {
        this.saving = false;
      }
    },

    discard() {
      this.flow = JSON.parse(JSON.stringify(this.original));
      this.selectedStepId = null;
    },

    handleRealtimeEvent(event) {
      // TODO: nothing reacts to server events yet
      console.info("[realtime]", event);
    },

    selectStep(stepId) {
      this.selectedStepId = stepId;
    },

    addStep(type, position) {
      const definition = STEP_TYPES[type];
      const step = {
        id: crypto.randomUUID(),
        type,
        displayName: definition.label,
        properties: definition.defaults()
      };
      insertStep(this.flow, step, position);
      this.selectedStepId = step.id;
    },

    deleteStep(stepId) {
      if (!canRemoveStep(this.flow, stepId)) {
        useUiStore().notify({ intent: "warning", text: "Remove the steps inside this condition first." });
        return;
      }
      
      const users = findStepsUsing(this.flow, stepId);
      if (users.length) {
        const names = users.map((s) => `- ${s.displayName}`).join("\n");
        const ok = window.confirm(
          `Other steps use the output of this step:\n\n${names}\n\nDelete it anyway?`
        );
        if (!ok) return;
      }

      removeStep(this.flow, stepId);
      if (this.selectedStepId === stepId) this.selectedStepId = null;
    }
  }
});
