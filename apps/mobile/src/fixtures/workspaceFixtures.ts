export type FixtureNote = {
  created: string
  date: string
  favorite: boolean
  id: string
  links: number
  modified: string
  relationships: FixtureRelationship[]
  status: string
  snippet: string
  tags: string[]
  title: string
  type: string
  typeTone: FixtureTone
  workspace: string
}

export type FixtureRelationshipKind = 'belongsTo' | 'has' | 'relatedTo' | 'custom'

export type FixtureRelationship = {
  kind: FixtureRelationshipKind
  label?: string
  values: string[]
}

export type FixtureTone = 'green' | 'orange' | 'purple'

export type FixtureSidebarIcon =
  | 'archive'
  | 'file'
  | 'folder'
  | 'inbox'
  | 'procedure'
  | 'star'
  | 'tag'

export type FixtureSidebarItem = {
  active?: boolean
  count?: string
  icon: FixtureSidebarIcon
  id: string
  label: string
  tone?: FixtureTone
}

export type FixtureSidebarSection = {
  count?: string
  id: string
  items: FixtureSidebarItem[]
  label?: string
}

export type FixtureSyncStatus = {
  kind: 'conflict' | 'pullRequired' | 'synced'
  minutesAgo?: number
}

export type WorkspaceScenario = {
  editorBullets: string[]
  id: WorkspaceScenarioId
  noteListSubtitle: string
  notes: FixtureNote[]
  searchQuery?: string
  selectedNoteId?: string
  sidebarSections: FixtureSidebarSection[]
  sync: FixtureSyncStatus
}

export type WorkspaceScenarioId =
  | 'default'
  | 'dense-sidebar'
  | 'empty-inbox'
  | 'long-title'
  | 'property-heavy'

export const fixtureEditorBullets = [
  'The current narrative routes every workflow through an LLM surface.',
  'Tolaria should keep writing, relationships, and properties visible together.',
  'The mobile UI should match desktop semantics before phone-specific reduction.',
]

export const fixtureNotes: FixtureNote[] = [
  {
    id: 'workflow-orchestration',
    title: 'Workflow Orchestration Essay',
    snippet: 'The current narrative and temptation: everything routed through an LLM.',
    type: 'Essay',
    typeTone: 'green',
    tags: ['Design', 'AI'],
    status: 'Draft',
    date: 'May 13, 2026',
    modified: '9h ago',
    created: '5d ago',
    favorite: true,
    links: 12,
    relationships: [
      {
        kind: 'belongsTo',
        values: ['LLM Workflow', 'Tolaria MVP'],
      },
      {
        kind: 'relatedTo',
        values: ['Release Notes'],
      },
      {
        kind: 'custom',
        label: 'Mentions',
        values: ['AI Ops Guide'],
      },
    ],
    workspace: 'TV',
  },
  {
    id: 'open-source-project',
    title: 'How I Run an Open Source Project',
    snippet: 'Tolaria unexpected success: various sources of input, requests, and bugs.',
    type: 'Procedure',
    typeTone: 'purple',
    tags: ['Process', 'Public'],
    status: 'Active',
    date: 'May 12, 2026',
    modified: '10h ago',
    created: '10h ago',
    favorite: false,
    links: 8,
    relationships: [
      {
        kind: 'has',
        values: ['Contributor Guide', 'Community Forum'],
      },
      {
        kind: 'belongsTo',
        values: ['Project Board'],
      },
    ],
    workspace: 'TV',
  },
  {
    id: 'release-2026-05-02',
    title: 'v2026-05-02',
    snippet: 'Release cleanup date, bug fixes, and mobile planning notes.',
    type: 'Release',
    typeTone: 'orange',
    tags: ['Tolaria MVP'],
    status: 'Shipped',
    date: 'May 2, 2026',
    modified: '12h ago',
    created: '1d ago',
    favorite: false,
    links: 18,
    relationships: [
      {
        kind: 'relatedTo',
        values: ['QA Checklist', 'Mobile Planning'],
      },
      {
        kind: 'has',
        values: ['Release Notes', 'Postmortem'],
      },
    ],
    workspace: 'TV',
  },
]

const longTitleNote: FixtureNote = {
  id: 'long-title-layout-pressure',
  title: 'A Very Long Note Title That Should Stay Readable Without Pushing Type Icons or Property Controls Out of Alignment',
  snippet: 'Used to verify row truncation, editor title wrapping, and toolbar stability.',
  type: 'Essay',
  typeTone: 'green',
  tags: ['Design', 'Mobile', 'Layout'],
  status: 'Draft',
  date: 'June 3, 2026',
  modified: '14m ago',
  created: '2d ago',
  favorite: false,
  links: 6,
  relationships: [
    {
      kind: 'relatedTo',
      values: ['Tablet Shell', 'Properties Panel'],
    },
  ],
  workspace: 'TV',
}

const propertyHeavyNote: FixtureNote = {
  id: 'mobile-ui-property-heavy',
  title: 'Mobile UI Parity Review',
  snippet: 'A dense fixture for multi-value properties, relationship groups, and long metadata sets.',
  type: 'Procedure',
  typeTone: 'purple',
  tags: ['Mobile', 'Parity', 'Design QA', 'Tablet', 'Inspector', 'Relationships'],
  status: 'Active',
  date: 'June 9, 2026',
  modified: '3m ago',
  created: '4d ago',
  favorite: true,
  links: 32,
  relationships: [
    {
      kind: 'belongsTo',
      values: ['Tolaria Mobile', 'Tablet Workspace'],
    },
    {
      kind: 'has',
      values: ['Navigation Pass', 'Property Inspector Pass', 'Sync Footer Pass', 'Screenshot QA Matrix'],
    },
    {
      kind: 'relatedTo',
      values: ['Desktop Inspector', 'Relationship Model', 'Mobile Design Review'],
    },
    {
      kind: 'custom',
      label: 'Depends on',
      values: ['Fixture Harness', 'Expo Web Export', 'Playwright Screenshots'],
    },
  ],
  workspace: 'TV',
}

const defaultSidebarSections: FixtureSidebarSection[] = [
  {
    id: 'primary',
    items: [
      { id: 'inbox', active: true, count: '7', icon: 'inbox', label: 'Inbox' },
      { id: 'all-notes', count: '8846', icon: 'file', label: 'All Notes' },
      { id: 'archive', count: '276', icon: 'archive', label: 'Archive' },
    ],
  },
  {
    id: 'favorites',
    label: 'Favorites',
    items: [
      { id: 'personal-journal', icon: 'star', label: 'Personal Journal' },
      { id: 'tolaria-mvp', icon: 'folder', label: 'Tolaria MVP' },
    ],
  },
  {
    count: '517',
    id: 'types',
    label: 'Types',
    items: [
      { id: 'essays', count: '448', icon: 'file', label: 'Essays', tone: 'green' },
      { id: 'procedures', count: '51', icon: 'procedure', label: 'Procedures', tone: 'purple' },
      { id: 'responsibilities', count: '18', icon: 'tag', label: 'Responsibilities', tone: 'orange' },
    ],
  },
]

const denseSidebarSections: FixtureSidebarSection[] = [
  ...defaultSidebarSections,
  {
    count: '24',
    id: 'projects',
    label: 'Projects',
    items: [
      { id: 'mobile', count: '12', icon: 'folder', label: 'Tolaria Mobile' },
      { id: 'research', count: '8', icon: 'folder', label: 'Research Backlog' },
      { id: 'publishing', count: '4', icon: 'folder', label: 'Publishing System' },
    ],
  },
  {
    count: '86',
    id: 'statuses',
    label: 'Statuses',
    items: [
      { id: 'draft', count: '44', icon: 'tag', label: 'Draft', tone: 'orange' },
      { id: 'active', count: '29', icon: 'tag', label: 'Active', tone: 'purple' },
      { id: 'shipped', count: '13', icon: 'tag', label: 'Shipped', tone: 'green' },
    ],
  },
]

export const defaultWorkspaceScenarioId: WorkspaceScenarioId = 'default'

export const workspaceScenarios: Record<WorkspaceScenarioId, WorkspaceScenario> = {
  default: {
    editorBullets: fixtureEditorBullets,
    id: 'default',
    noteListSubtitle: '7 open notes',
    notes: fixtureNotes,
    selectedNoteId: fixtureNotes[0].id,
    sidebarSections: defaultSidebarSections,
    sync: { kind: 'synced', minutesAgo: 2 },
  },
  'dense-sidebar': {
    editorBullets: fixtureEditorBullets,
    id: 'dense-sidebar',
    noteListSubtitle: '7 open notes',
    notes: fixtureNotes,
    selectedNoteId: fixtureNotes[1].id,
    sidebarSections: denseSidebarSections,
    sync: { kind: 'synced', minutesAgo: 8 },
  },
  'empty-inbox': {
    editorBullets: fixtureEditorBullets,
    id: 'empty-inbox',
    noteListSubtitle: '0 open notes',
    notes: [],
    searchQuery: 'Inbox',
    sidebarSections: defaultSidebarSections,
    sync: { kind: 'pullRequired' },
  },
  'long-title': {
    editorBullets: [
      'This note intentionally uses a title long enough to pressure the row, toolbar, and editor heading.',
      'The title should truncate in narrow slots and wrap only inside the editor content area.',
    ],
    id: 'long-title',
    noteListSubtitle: '8 open notes',
    notes: [longTitleNote, ...fixtureNotes],
    selectedNoteId: longTitleNote.id,
    sidebarSections: defaultSidebarSections,
    sync: { kind: 'synced', minutesAgo: 1 },
  },
  'property-heavy': {
    editorBullets: [
      'Property-heavy notes should preserve scanability even when relationships contain several typed groups.',
      'The add-property and add-relationship affordances must remain visible without becoming floating actions.',
    ],
    id: 'property-heavy',
    noteListSubtitle: '8 open notes',
    notes: [propertyHeavyNote, ...fixtureNotes],
    selectedNoteId: propertyHeavyNote.id,
    sidebarSections: defaultSidebarSections,
    sync: { kind: 'conflict' },
  },
}

export function workspaceScenarioForId(id: string | null | undefined) {
  if (!id || !(id in workspaceScenarios)) {
    return workspaceScenarios[defaultWorkspaceScenarioId]
  }

  return workspaceScenarios[id as WorkspaceScenarioId]
}
