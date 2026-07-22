# Product

## Register

product

## Platform

web

## Users
Three roles share one system. **Customers** book a haircut or salon service from a phone or laptop, usually in a hurry, and want to be in and out of the flow in under a minute. **Staff** (barbers, hairstylists) work a queue on a shop tablet or phone between clients, accepting or rejecting incoming appointments and moving them through the service lifecycle. **Admins** run the single branch from a desk: inventory, pricing, discounts, staff accounts, analytics, and system mode. The public landing page speaks to a fourth group, prospective customers who have not signed up yet, and its only job is to earn the booking.

## Product Purpose
AzCuts replaces walk-in guesswork and paper logs for one barber shop and salon. It exists so a customer can self-book a service plus extras, get routed to a real staff member (or auto-assigned to the least-loaded one), and leave with a correct, downloadable receipt, while the shop gets a live operational picture and clean books. Success is a booking completed without a phone call, a staff queue that never double-books, and money that is always right.

## Positioning
The self-serve booking counter for a real chair-and-scissors shop: everything a front desk would do, minus the front desk.

## Brand Personality
Clean, sharp, and calm. The voice is plain and confident, never salesy or cute. Customers should feel the same quiet competence they want from a good barber: no clutter, no surprises, precise work. The portals should feel like a well-run shop; the landing page can turn up the confidence and style.

## Anti-references
Not a generic Bootstrap admin template with a purple gradient sidebar. Not a cluttered enterprise dashboard where every metric fights for attention. Not the hero-metric SaaS landing cliché (big gradient number, three supporting stats). Not AI-slop marketing pages with an uppercase tracked eyebrow above every section. Familiarity in the product surfaces is a feature; strangeness for its own sake is the failure.

## Design Principles
The tool disappears into the task. In the portals, clarity and speed beat decoration; a customer mid-booking or a barber mid-shift should never have to think about the interface.

The server is the single source of truth. The client displays money, status, roles, and availability that the API computes; it never recomputes them or trusts its own copy. UI states must reflect server truth, including "pending, awaiting staff."

One vocabulary across three portals. The same button, badge, table, and form controls mean the same thing whether you are a customer, a barber, or the owner. Consistency is the point; delight is saved for moments (the landing hero, a completed booking), not sprayed across every screen.

Every surface has a real empty, loading, and error state. Skeletons over spinners, empty states that teach the next action, errors that say what happened and how to fix it.

Trustworthy and reachable by default. Contrast that passes, focus you can see, keyboard paths through the wizard and tables, motion that respects `prefers-reduced-motion`, and a light/dark theme that is legible in both.

## Accessibility & Inclusion
Target WCAG 2.1 AA as the working floor: body text at or above 4.5:1 contrast in both themes, visible `focus-visible` rings on every interactive element, aria labels on icon-only controls, and a fully keyboard-navigable booking wizard and data tables. Respect `prefers-reduced-motion` with reduced or crossfade alternatives, and never encode status by color alone (status pills carry a text label, not just a hue). Full AA conformance still requires manual testing with assistive technology and expert review before any accessibility claim is made.
