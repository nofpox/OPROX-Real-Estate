---
name: Rkz buyer-seller role gate
description: Architecture of the mandatory role-selection entry gate in the Rkz Expo app
---

## Role Gate Architecture

- `selectedRole: "buyer" | "seller" | null` lives in `AppContext` (not in `User`)
- Persisted via `AsyncStorage` key `rkz_user_role`; loaded during `boot()` in `AppProvider`
- `setSelectedRole(r)` in context: updates state + writes AsyncStorage (fire-and-forget)

## Rendering pattern

- `(tabs)/_layout.tsx` wraps tabs in `<RoleGate />` + the tab navigator
- `RoleGate` renders a `<Modal visible={!selectedRole}>` full-screen overlay — disappears the moment `selectedRole` is truthy
- Buyer selection → `AsyncStorage.setItem(rkz_discovery_filter, "all")`, default tab (index = Discovery Map)
- Seller selection → `setTimeout(() => router.navigate("/(tabs)/add"), 80)` after state commit

## Tab rename

- `ai-concierge.tsx` tab: label changed from `tabs.assistant` to `tabs.myRequests`
- SF symbol: `{ default: "checklist", selected: "checklist.checked" }` — `"checklist.checked"` is NOT in `SFSymbols7_0`; cast with `sf={item.sf as any}` in NativeTabLayout `<Icon>` call
- Material icon: `"assignment"`

## Key AsyncStorage keys

- `rkz_user_role` — "buyer" | "seller" (role selection persistence)
- `rkz_discovery_filter` — active type filter on Discovery Map (pre-selected by role gate for buyers)
- `rkz_negotiation_requests` — array of NegotiationRequest logged by "طلب تفاوض" button; read by طلباتي tab
- `rkz_admin_events` (ADMIN_EVENTS_KEY from useAIAssistant.ts) — admin audit log for negotiation + service requests

## Why

Directive: no direct P2P contact; all buyer-seller communication goes through "Request Negotiation" → admin queue. Buyers need a discovery-focused entry point; sellers need the property-registration tab.
