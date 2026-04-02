import { createTheme, ThemeProvider } from '@mui/material/styles';

const theme = createTheme({
    components: {
    MuiButton: {
      styleOverrides: {
        root: {
          padding: '10px 28px',   
        }
      }
    }
  },
  typography: {
    fontFamily: 'DM Sans, sans-serif',
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  shape: {
    // borderRadius: 999,
  },
});

export default function MuiThemeProvider({ children }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}