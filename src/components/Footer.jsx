export default function Footer({ visible }) {
  return (
    <footer className="app-footer" style={{ display: visible ? 'flex' : 'none' }}>
      <span>Space · Start / Pause</span>
      <span className="footer-sep"></span>
      <span>R · Reset</span>
      <span className="footer-sep"></span>
      <span>S · Skip</span>
    </footer>
  );
}
