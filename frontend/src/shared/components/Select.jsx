import { Children, isValidElement, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import '../styles/controls.css';

function optionsFrom(children, group = '') {
  return Children.toArray(children).flatMap(child => {
    if (!isValidElement(child)) return [];
    if (child.type === 'optgroup') return optionsFrom(child.props.children, child.props.label);
    if (child.type !== 'option') return optionsFrom(child.props.children, group);
    const label = Children.toArray(child.props.children).join('');
    return [{ value: String(child.props.value ?? label), label, disabled: Boolean(child.props.disabled), group }];
  });
}

/** A native form value with a consistent, keyboard-accessible popover. */
export default function Select({ children, value, defaultValue, onChange, className = '', style = {}, disabled, ...props }) {
  const uid = useId().replace(/:/g, '');
  const native = useRef(null), trigger = useRef(null), menu = useRef(null), search = useRef({ value: '', at: 0 });
  const [open, setOpen] = useState(false), [active, setActive] = useState(-1), [box, setBox] = useState(null);
  const [internal, setInternal] = useState(defaultValue), [label, setLabel] = useState(''), [validation, setValidation] = useState({});
  const options = optionsFrom(children);
  const selected = String(value ?? internal ?? options[0]?.value ?? '');
  const chosen = options.find(item => item.value === selected);
  const listId = `select-${uid}-list`;
  const close = (focus = false) => { setOpen(false); if (focus) trigger.current?.focus(); };
  useLayoutEffect(() => {
    const element = native.current;
    const copyState = () => setValidation({ 'aria-invalid': element.getAttribute('aria-invalid') || undefined, 'aria-describedby': element.getAttribute('aria-describedby') || undefined });
    copyState();
    const observer = new MutationObserver(copyState);
    observer.observe(element, { attributes: true, attributeFilter: ['aria-invalid', 'aria-describedby'] });
    const original = element.labels?.[0];
    if (original) {
      const clone = original.cloneNode(true);
      clone.querySelectorAll('select,button,input,textarea,.field-error,.field-hint,small').forEach(node => node.remove());
      setLabel(clone.textContent.replace(/\s+/g, ' ').trim());
    }
    const labelClick = event => {
      if (event.target.closest('a,button,input,select,textarea')) return;
      event.preventDefault(); trigger.current?.focus();
    };
    original?.addEventListener('click', labelClick);
    return () => { observer.disconnect(); original?.removeEventListener('click', labelClick); };
  }, [props.id]);
  useLayoutEffect(() => {
    if (!open) return;
    const position = () => {
      const rect = trigger.current.getBoundingClientRect();
      const below = innerHeight - rect.bottom - 16, above = rect.top - 16;
      const up = below < Math.min(240, options.length * 40 + 12) && above > below;
      const height = Math.min(300, Math.max(80, up ? above : below));
      const width = Math.min(Math.max(rect.width, 180), innerWidth - 16);
      setBox({ left: Math.max(8, Math.min(rect.left, innerWidth - width - 8)), width, maxHeight: height, ...(up ? { bottom: innerHeight - rect.top + 6 } : { top: rect.bottom + 6 }) });
    };
    position();
    const outside = event => { if (!trigger.current?.contains(event.target) && !menu.current?.contains(event.target)) close(); };
    const scroll = event => { if (!menu.current?.contains(event.target)) position(); };
    document.addEventListener('pointerdown', outside, true); window.addEventListener('resize', position); window.addEventListener('scroll', scroll, true);
    return () => { document.removeEventListener('pointerdown', outside, true); window.removeEventListener('resize', position); window.removeEventListener('scroll', scroll, true); };
  }, [open, options.length]);
  useEffect(() => { if (open) menu.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' }); }, [active, open]);
  useEffect(() => { if (disabled) setOpen(false); }, [disabled]);
  const show = () => {
    if (trigger.current?.matches(':disabled')) return;
    setActive(Math.max(0, options.findIndex(item => item.value === selected && !item.disabled))); setOpen(true);
  };
  const choose = index => {
    const item = options[index]; if (!item || item.disabled) return;
    if (item.value !== selected) {
      native.current.value = item.value;
      native.current.dispatchEvent(new Event('change', { bubbles: true }));
    }
    close(true);
  };
  const keyDown = event => {
    const key = event.key;
    if (key === 'Tab') { close(); return; }
    if (key === 'Escape') { if (open) { event.preventDefault(); event.stopPropagation(); } close(); return; }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(key)) {
      event.preventDefault(); if (!open) { show(); return; }
      const enabled = options.map((item, index) => !item.disabled ? index : -1).filter(index => index >= 0);
      if (!enabled.length) return;
      const current = enabled.indexOf(active);
      setActive(key === 'Home' ? enabled[0] : key === 'End' ? enabled.at(-1) : enabled[(current + (key === 'ArrowDown' ? 1 : -1) + enabled.length) % enabled.length]);
    } else if (key === 'Enter' || key === ' ') {
      event.preventDefault(); if (open) choose(active); else show();
    } else if (key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault(); const now = Date.now();
      search.current.value = now - search.current.at < 650 ? search.current.value + key.toLowerCase() : key.toLowerCase(); search.current.at = now;
      const match = options.findIndex(item => !item.disabled && item.label.toLowerCase().startsWith(search.current.value));
      if (!open) show(); if (match >= 0) setActive(match);
    }
  };
  return <div className="app-select" style={{ width: style.width, minWidth: style.minWidth, maxWidth: style.maxWidth }}>
    <select {...props} ref={native} data-ui-select="true" className="app-select__native" tabIndex={-1} aria-hidden="true" disabled={disabled} value={selected}
      onFocus={() => trigger.current?.focus()} onChange={event => { setInternal(event.target.value); onChange?.(event); }}>{children}</select>
    <button ref={trigger} type="button" role="combobox" className={`app-select__trigger ${className}`} disabled={disabled} aria-label={props['aria-label'] || label || `${chosen?.label || 'Choose an option'} options`}
      aria-expanded={open} aria-controls={open ? listId : undefined} aria-haspopup="listbox" aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
      aria-required={props.required || undefined} {...validation} onKeyDown={keyDown} onClick={() => open ? close() : show()} onBlur={event => { if (!menu.current?.contains(event.relatedTarget)) close(); }}>
      <span className={!selected ? 'is-placeholder' : ''}>{chosen?.label || selected || 'Choose an option'}</span><ChevronDown size={16} className={open ? 'is-open' : ''} />
    </button>
    {open && box && createPortal(<div ref={menu} id={listId} role="listbox" aria-label={props['aria-label'] || label || 'Options'} className="app-select__menu" style={box} onMouseDown={event => event.preventDefault()}>
      {options.map((item, index) => <div key={`${index}-${item.value}`} id={`${listId}-${index}`} role="option" aria-selected={item.value === selected} aria-disabled={item.disabled || undefined} data-index={index}
        className={`app-select__option${index === active ? ' is-highlighted' : ''}${item.value === selected ? ' is-selected' : ''}`}
        onPointerMove={() => !item.disabled && setActive(index)} onClick={() => choose(index)}>
        <span>{item.label}</span>{item.value === selected && <Check size={15} />}
      </div>)}
      {!options.length && <p className="app-select__empty">No options available</p>}
    </div>, native.current?.closest('dialog') || document.body)}
  </div>;
}
