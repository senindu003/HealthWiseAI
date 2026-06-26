---
name: HealthWise AI System
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#43474d'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#74777e'
  outline-variant: '#c4c6ce'
  surface-tint: '#49607e'
  primary: '#000f22'
  on-primary: '#ffffff'
  primary-container: '#0a2540'
  on-primary-container: '#768dad'
  inverse-primary: '#b0c8eb'
  secondary: '#006c4a'
  on-secondary: '#ffffff'
  secondary-container: '#82f5c1'
  on-secondary-container: '#00714e'
  tertiary: '#060045'
  on-tertiary: '#ffffff'
  tertiary-container: '#150082'
  on-tertiary-container: '#7f7bff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d2e4ff'
  primary-fixed-dim: '#b0c8eb'
  on-primary-fixed: '#001c37'
  on-primary-fixed-variant: '#314865'
  secondary-fixed: '#85f8c4'
  secondary-fixed-dim: '#68dba9'
  on-secondary-fixed: '#002114'
  on-secondary-fixed-variant: '#005137'
  tertiary-fixed: '#e2dfff'
  tertiary-fixed-dim: '#c3c0ff'
  on-tertiary-fixed: '#0f0069'
  on-tertiary-fixed-variant: '#321ed2'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
  success: '#10B981'
  warning: '#F59E0B'
  danger: '#EF4444'
  card-bg: '#FFFFFF'
  text-primary: '#0F172A'
  text-secondary: '#475569'
  text-tertiary: '#94A3B8'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 60px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.03em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  container-max: 1280px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 48px
  section-gap: 64px
---

## Brand & Style

The design system is built on the pillars of **clinical precision** and **human-centric elegance**. It targets a high-end healthcare demographic that demands the reliability of a medical institution with the fluid, effortless experience of a premium tech product. 

The visual style is a synthesis of **Minimalism** and **Modern Corporate** aesthetics. It utilizes vast amounts of white space, a highly disciplined grid, and subtle depth to create a "breathable" interface. The goal is to reduce cognitive load in complex medical environments, replacing traditional medical clutter with "Apple-esque" clarity and "Linear-grade" efficiency.

## Colors

The palette is anchored by **Deep Blue (#0A2540)**, providing a foundation of authority and trust. **Emerald (#059669)** serves as the secondary brand color, representing health and vitality, while **Indigo (#635BFF)** acts as a high-tech accent for interactive elements and AI-driven features.

The background uses a very light cool-gray (**#F8FAFC**) to make the **Pure White (#FFFFFF)** cards appear "elevated" and crisp. The text hierarchy utilizes a Slate scale to ensure soft but legible contrast, avoiding the harshness of pure black.

## Typography

This design system prioritizes legibility and modern character by using **Plus Jakarta Sans** for primary headings and body copy. Its open counters and friendly geometry soften the clinical nature of the content. **Inter** is reserved for labels, data tables, and small UI metadata to maintain a systematic, functional feel.

Headline scales are generous to create a clear information hierarchy. On mobile devices, the `display` and `headline-lg` levels should be reduced according to the provided mobile tokens to ensure the layout remains balanced.

## Layout & Spacing

The layout follows a **Fixed-Fluid Hybrid** model. Content is centered within a 1280px container on desktop with a 12-column grid. On smaller breakpoints, the layout becomes fluid with 16px lateral margins on mobile and 24px on tablets.

Spacing is governed by an 8px linear scale. Large components like Metric Cards and Section Containers should utilize the `section-gap` and `margin-desktop` values to maintain the "spacious" feeling of the brand. Horizontal rhythm is maintained through 24px gutters, ensuring data-heavy charts do not feel cramped.

## Elevation & Depth

Hierarchy is established through **Ambient Shadows** and **Tonal Layers**. Instead of harsh borders, surfaces use a tiered approach:
- **Base Level:** Very light gray (#F8FAFC) background.
- **Card Level:** Pure white surfaces with a soft, multi-layered shadow (0px 4px 20px rgba(0,0,0,0.04)).
- **Floating Level:** Modals and dropdowns use a more pronounced shadow (0px 12px 32px rgba(0,0,0,0.08)) to signify temporary interaction.

To mimic the Linear and Stripe aesthetic, cards may use a ultra-thin (1px) border in a slightly darker neutral shade (#E2E8F0) to define edges without adding visual weight.

## Shapes

The design system utilizes a signature **24px (1.5rem)** corner radius for all primary containers and cards. This large radius is a key identifier of the premium, approachable brand personality.

Secondary elements like buttons and input fields follow a standard `rounded-lg` (1rem) or `rounded-md` (0.5rem) scale to ensure they feel precise and interactive compared to the structural containers they sit within.

## Components

### Metric Cards
The primary vehicle for data. These should be pure white with 24px rounded corners. They include a small `label-sm` title, a `display-lg` metric, and a subtle sparkline chart using the brand secondary (Emerald) or Indigo colors.

### Medical-Grade Charts
Charts should use a "clean-line" philosophy. Avoid heavy grid lines; use light gray dotted lines for the Y-axis and eliminate the X-axis line entirely. Data points should have a 2px white stroke to pop against the background.

### Buttons & Inputs
- **Primary Action:** Solid Deep Blue with white text, 8px rounded corners, and a slight lift on hover.
- **Form Inputs:** Large, 48px height minimum, with soft gray borders and a subtle Indigo focus ring. 
- **Micro-interactions:** Use "Stripe-style" transitions—smooth, 200ms ease-in-out transforms for hover states and layout shifts.

### Timeline Components
A vertical 2px Indigo line connecting health events. Events are represented by white cards with a smaller 16px radius, featuring an icon in the brand indigo for AI-generated insights or emerald for patient-logged data.