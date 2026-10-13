type Props = { className?: string };
export default function RoeMark({ className = '' }: Props) {
  return <svg className={`roe-mark ${className}`} viewBox="0 0 100 100" width="44" height="44" fill="none" aria-hidden="true"><circle cx="50" cy="24" r="11" fill="currentColor" opacity=".95"/><circle cx="28" cy="42" r="11" fill="currentColor" opacity=".8"/><circle cx="72" cy="42" r="11" fill="currentColor" opacity=".9"/><circle cx="36" cy="68" r="11" fill="currentColor" opacity=".65"/><circle cx="64" cy="68" r="11" fill="currentColor" opacity=".82"/><circle cx="50" cy="46" r="11" fill="currentColor"/><circle cx="46" cy="20" r="3" fill="white" opacity=".6"/><circle cx="24" cy="38" r="3" fill="white" opacity=".5"/><circle cx="68" cy="38" r="3" fill="white" opacity=".5"/></svg>;
}
