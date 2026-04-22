import Button from "@mui/material/Button";
import MuiThemeProvider from "./MuiTheme.jsx";

const sizes = {
  small: { fontSize: '0.8rem', padding: '6px 16px' },
  medium: { fontSize: '0.9rem', padding: '10px 24px' },
  large: { fontSize: '1rem', padding: '14px 32px' },
};

const styles = {
  primary: {
    muiVariant: 'contained',
    sx: { backgroundColor: '#15B29B', color: '#fff', '&:hover': { backgroundColor: '#117a65' } }
  },
  outline: {
    muiVariant: 'outlined',
    sx: { borderColor: '#fff', color: '#fff', '&:hover': { borderColor: '#15B29B', color: '#15B29B' } }
  },
  dark: {
    muiVariant: 'contained',
    sx: { backgroundColor: '#232323', color: '#fff', '&:hover': { backgroundColor: '#15B29B' } }
  },
  white: {
    muiVariant: 'contained',
    sx: { backgroundColor: '#ffffff', color: '#232323', '&:hover': { backgroundColor: '#15B29B', color: '#fff' } }
  },
  ghost: {
    muiVariant: 'text',
    sx: { color: '#232323', '&:hover': { color: '#15B29B' } }
  },
};

/**
 * @typedef {'primary' | 'outline' | 'dark' | 'white' | 'ghost'} ButtonType
 * @typedef {'small' | 'medium' | 'large'} ButtonSize
 *
 * @param {{
 *   text: string,
 *   btnType?: ButtonType,
 *   href?: string,
 *   size?: ButtonSize
 * }} props
 */
export default function MuiButton({ text, btnType = 'primary', href, size = 'medium' }) {
  const { muiVariant, sx } = styles[btnType];
  const sizeStyle = sizes[size];

  return (
    <MuiThemeProvider>
      <Button variant={muiVariant} href={href} sx={{ ...sx, ...sizeStyle }}>
        {text}
      </Button>
    </MuiThemeProvider>
  );
}