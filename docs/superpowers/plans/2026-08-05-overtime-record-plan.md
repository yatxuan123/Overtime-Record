# 加班记录页面 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 构建一个 React + Vite 的加班记录单页工作台，支持记录管理、汇总统计和浏览器本地持久化。

**Architecture:** 使用单页 React 应用，`App` 负责状态和工作流编排，表单、汇总和列表拆成聚焦组件。记录通过 `localStorage` 读写，所有汇总由当前记录派生计算。

**Tech Stack:** React 18, Vite, TypeScript, lucide-react, CSS Modules-free plain CSS。

## Global Constraints

- 使用 `pnpm` 安装依赖。
- 不连接后端，数据只保存在当前浏览器 `localStorage`。
- 录入字段为日期、加班时长、是否打车、打车费用和备注。
- 页面需支持桌面端和移动端，且无横向溢出。

### Task 1: Scaffold the Vite application

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/vite-env.d.ts`

- [ ] **Step 1: Write package metadata and scripts**
- [ ] **Step 2: Install dependencies with `pnpm install`**
- [ ] **Step 3: Add the Vite entry point and mount React**

### Task 2: Implement state and record workflow

**Files:**
- Create: `src/types.ts`
- Create: `src/storage.ts`
- Create: `src/App.tsx`

**Interfaces:**
- `OvertimeRecord`: `{ id: string; date: string; hours: number; tookTaxi: boolean; taxiCost: number; note: string }`
- `loadRecords(): OvertimeRecord[]`
- `saveRecords(records: OvertimeRecord[]): void`

- [ ] **Step 1: Add record types and resilient localStorage helpers**
- [ ] **Step 2: Add controlled form state with validation**
- [ ] **Step 3: Implement add, edit, delete and reset flows**
- [ ] **Step 4: Derive current-month summaries and sorted records**

### Task 3: Build the visual system and responsive UI

**Files:**
- Create: `src/components/SummaryCards.tsx`
- Create: `src/components/OvertimeForm.tsx`
- Create: `src/components/RecordList.tsx`
- Create: `src/styles.css`

- [ ] **Step 1: Add the dark green / warm white / orange token system**
- [ ] **Step 2: Implement semantic header, summary cards and form**
- [ ] **Step 3: Implement record rows with edit/delete actions and empty state**
- [ ] **Step 4: Add responsive breakpoints for mobile stacking and two-column metrics**

### Task 4: Verify the workflow

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Run the production build**
- [ ] **Step 2: Start the Vite dev server**
- [ ] **Step 3: Verify add/edit/delete, taxi toggle, persistence and responsive layout in browser**
