import { useMemo, useReducer } from 'react';

export const STEPS = ['Service', 'Extras', 'Schedule', 'Payment', 'Confirm'];

const initialState = {
  step: 0,
  service: null,
  extras: [],
  date: null,
  slot: null,
  staff: 'auto', // 'auto' | staffId
  paymentMethod: 'cash',
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, step: Math.max(0, Math.min(STEPS.length - 1, action.step)) };
    case 'NEXT':
      return { ...state, step: Math.min(STEPS.length - 1, state.step + 1) };
    case 'BACK':
      return { ...state, step: Math.max(0, state.step - 1) };
    // Changing the service or extras alters the block length, so any chosen slot
    // is no longer valid — clear it.
    case 'SET_SERVICE':
      return { ...state, service: action.service, slot: null };
    case 'TOGGLE_EXTRA': {
      const exists = state.extras.some((e) => e._id === action.extra._id);
      const extras = exists
        ? state.extras.filter((e) => e._id !== action.extra._id)
        : [...state.extras, action.extra];
      return { ...state, extras, slot: null };
    }
    case 'SET_DATE':
      return { ...state, date: action.date, slot: null };
    case 'SET_SLOT':
      return { ...state, slot: action.slot };
    // Availability differs per barber, so switching staff clears the slot.
    case 'SET_STAFF':
      return { ...state, staff: action.staff, slot: null };
    case 'SET_PAYMENT':
      return { ...state, paymentMethod: action.paymentMethod };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

export function useBooking() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const actions = useMemo(
    () => ({
      setStep: (step) => dispatch({ type: 'SET_STEP', step }),
      next: () => dispatch({ type: 'NEXT' }),
      back: () => dispatch({ type: 'BACK' }),
      setService: (service) => dispatch({ type: 'SET_SERVICE', service }),
      toggleExtra: (extra) => dispatch({ type: 'TOGGLE_EXTRA', extra }),
      setDate: (date) => dispatch({ type: 'SET_DATE', date }),
      setSlot: (slot) => dispatch({ type: 'SET_SLOT', slot }),
      setStaff: (staff) => dispatch({ type: 'SET_STAFF', staff }),
      setPayment: (paymentMethod) => dispatch({ type: 'SET_PAYMENT', paymentMethod }),
      reset: () => dispatch({ type: 'RESET' }),
    }),
    []
  );

  const subtotal =
    (state.service?.price || 0) + state.extras.reduce((sum, e) => sum + (e.price || 0), 0);
  const totalDuration =
    (state.service?.durationMinutes || 0) +
    state.extras.reduce((sum, e) => sum + (e.durationMinutes || 0), 0);

  return { ...state, ...actions, subtotal, totalDuration };
}

export default useBooking;
