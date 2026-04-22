import Timeline from '@mui/lab/Timeline';
import TimelineItem from '@mui/lab/TimelineItem';
import TimelineSeparator from '@mui/lab/TimelineSeparator';
import TimelineConnector from '@mui/lab/TimelineConnector';
import TimelineContent from '@mui/lab/TimelineContent';
import TimelineDot from '@mui/lab/TimelineDot';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { motion, useReducedMotion } from 'motion/react';
import MuiThemeProvider from './MuiTheme.jsx';

/**
 * @typedef {{ year: string, title: string, description: string }} TimelineEntry
 *
 * @param {{ items?: TimelineEntry[] }} props
 */
export default function ClubTimeline({ items = [] }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const prefersReducedMotion = useReducedMotion();

  const getCardOffset = index => {
    if (isMobile) return 18;
    return index % 2 === 0 ? -22 : 22;
  };

  return (
    <MuiThemeProvider>
      <Timeline
        position={isMobile ? 'right' : 'alternate'}
        sx={{
          my: 0,
          px: { xs: 0, md: 2 },
          [`& .MuiTimelineItem-root:before`]: {
            flex: { xs: 0, md: 1 },
            padding: 0,
          },
        }}
      >
        {items.map((item, index) => (
          <TimelineItem key={`${item.year}-${item.title}`} sx={{ minHeight: { md: 220 } }}>
            <TimelineSeparator
              sx={{
                alignSelf: 'stretch',
                position: 'relative',
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '2px',
                  backgroundColor: 'rgba(0, 0, 0, 0.18)',
                  zIndex: 0,
                },
              }}
            >
              <motion.div
                initial={prefersReducedMotion ? false : { scale: 0.92, opacity: 0 }}
                whileInView={prefersReducedMotion ? undefined : { scale: 1, opacity: 1 }}
                viewport={{ once: true, amount: 0.45 }}
                transition={{ duration: 0.45, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
                style={{ position: 'relative', zIndex: 1 }}
              >
                <TimelineDot
                  sx={{
                    backgroundColor: 'var(--color-secondary)',
                    color: 'var(--color-secondary)',
                  }}
                />
              </motion.div>
              {index < items.length - 1 && <TimelineConnector sx={{ display: 'none' }} />}
            </TimelineSeparator>
            <TimelineContent sx={{ py: { xs: 1.25, md: 2 }, px: 0, boxSizing: 'border-box' }}>
              <motion.div
                className="rounded-lg bg-[var(--color-bg-light)] p-4 md:p-5 shadow"
                initial={
                  prefersReducedMotion
                    ? false
                    : {
                        opacity: 0,
                        y: 20,
                        x: getCardOffset(index),
                      }
                }
                whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0, x: 0 }}
                viewport={{ once: true, amount: 0.2, margin: '0px 0px -8% 0px' }}
                transition={{ duration: 0.7, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  marginLeft: isMobile ? '1rem' : index % 2 === 0 ? '1.2rem' : '0',
                  marginRight: isMobile ? '0' : index % 2 === 0 ? '0' : '1.2rem',
                  willChange: prefersReducedMotion ? 'auto' : 'transform, opacity',
                }}
              >
                <p className="mb-1 text-sm font-bold uppercase tracking-[0.12em] text-[var(--color-secondary)]">
                  {item.year}
                </p>
                <h3 className="mb-2 text-lg md:text-xl font-bold">{item.title}</h3>
                <p className="text-sm md:text-base text-gray-600">{item.description}</p>
              </motion.div>
            </TimelineContent>
          </TimelineItem>
        ))}
      </Timeline>
    </MuiThemeProvider>
  );
}