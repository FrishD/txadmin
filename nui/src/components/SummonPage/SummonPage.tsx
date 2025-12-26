import React, { useState } from "react";
import { styled } from '@mui/material/styles';
import { Box, Fade, Typography } from "@mui/material";
import { useNuiEvent } from "../../hooks/useNuiEvent";
import { useTranslate } from "react-polyglot";
import { InfoOutlined } from "@mui/icons-material";

/**
 * Summon box styles
 */
const boxClasses = {
  root: `SummonBox-root`,
  inner: `SummonBox-inner`,
  title: `SummonBox-title`,
  message: `SummonBox-message`,
  instruction: `SummonBox-instruction`
};

const SummonInnerStyles = styled('div')({
  color: "whitesmoke",
  transition: "transform 300ms ease-in-out",
  maxWidth: "650px",
  fontFamily: "'Heebo', 'Assistant', 'Rubik', sans-serif",

  [`& .${boxClasses.inner}`]: {
    padding: 32,
    border: "3px dashed whitesmoke",
    borderRadius: 12,
    background: "rgba(255, 255, 255, 0.03)",
  },
  [`& .${boxClasses.title}`]: {
    display: "flex",
    margin: "-20px auto 18px auto",
    width: "max-content",
    borderBottom: "2px solid whitesmoke",
    paddingBottom: 5,
    fontWeight: 700,
    alignItems: "center",
    gap: "8px",
  },
  [`& .${boxClasses.message}`]: {
    fontSize: "1.3em",
    lineHeight: 1.8,
    textAlign: "center",
    direction: "rtl",
    letterSpacing: "0.3px",
  },
  [`& .${boxClasses.instruction}`]: {
    marginTop: "1em",
    textAlign: "center",
    opacity: 0.85,
  },
});

interface SummonInnerComp {
  secsRemaining: number;
  resetCounter: number;
  isClosable: boolean;
}

const SummonIcon = () => (
  <InfoOutlined
    style={{
      color: "lightblue",
      height: "2.8rem",
      width: "2.8rem",
    }}
  />
);

const SummonInnerComp: React.FC<SummonInnerComp> = ({
  secsRemaining,
  resetCounter,
  isClosable,
}) => {
  const t = useTranslate();
  const instructionFontSize = Math.min(1.5, 0.9 + resetCounter * 0.15);

  const [iHead, iTail] = t("nui_summon.instruction_close", {
    key: "%R%",
    smart_count: secsRemaining,
  }).split("%R%", 2);

  const iKey = <span style={{
    padding: "0.15rem 0.35rem",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    border: "1px solid rgba(255, 255, 255, 0.25)",
    fontFamily: "monospace",
    fontSize: "1.25em",
    letterSpacing: 1,
    borderRadius: 4,
    fontWeight: 600,
  }}>
    {t("nui_warning.dismiss_key")}
  </span>;

  return (
    <>
      <SummonInnerStyles className={boxClasses.root}>
        <Box className={boxClasses.inner}>
          <Box className={boxClasses.title}>
            <SummonIcon />
            <Typography variant="h3" style={{ fontWeight: 700 }}>
              בדיקת מחשב
            </Typography>
            <SummonIcon />
          </Box>
          <Typography
            className={boxClasses.message}
            letterSpacing={1}
            variant="h5"
          >
            זומנת לבדיקת מחשב. עליך להיכנס לחדר "מחכה לבדיקה" באופן מיידי.
            <br />
            <br />
            חל איסור למחוק קבצים או לצאת מהמשחק במהלך הבדיקה.
            <br />
            <br />
            נא לשמור על הקלטה מהרגע שבו הודעה זו מופיעה ועד לסיום הבדיקה.
            <br />
            <br />
            תודה על שיתוף הפעולה.
          </Typography>
        </Box>
      </SummonInnerStyles>
      <Box>
        <span
          style={{
            color: "whitesmoke",
            fontSize: `${instructionFontSize}em`,
          }}
        >
          {isClosable
            ? <>{iHead} {iKey} {iTail}</>
            : t("nui_summon.instruction_wait", { smart_count: secsRemaining })
          }
        </span>
      </Box>
    </>
  );
};

/**
 * Main summon container (whole page)
 */
const mainClasses = {
  root: `MainSummon-root`,
  miniBounce: `MainSummon-miniBounce`,
}

const MainPageStyles = styled('div')({
  [`& .${mainClasses.root}`]: {
    top: 0,
    left: 0,
    transition: "background-color 750ms ease-in-out",
    position: "absolute",
    height: "100vh",
    width: "100vw",
    display: "flex",
    flexDirection: "column",
    gap: "1em",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(30, 60, 114, 0.92)",
  },
  "@keyframes miniBounce": {
    "0%": {
      backgroundColor: "rgba(30, 60, 114, 0.92)",
    },
    "30%": {
      backgroundColor: "rgba(30, 60, 114, 0.60)",
    },
    "60%": {
      backgroundColor: "rgba(30, 60, 114, 0.30)",
    },
    "70%": {
      backgroundColor: "rgba(30, 60, 114, 0.60)",
    },
    "100%": {
      backgroundColor: "rgba(30, 60, 114, 0.92)",
    },
  },
  [`& .${mainClasses.miniBounce}`]: {
    animation: "miniBounce 500ms ease-in-out",
  },
});

const pulseSound = new Audio("sounds/warning_pulse.mp3");
const openSound = new Audio("sounds/warning_open.mp3");

export const SummonPage: React.FC = () => {
  const [isMiniBounce, setIsMiniBounce] = useState(false);

  const [isOpen, setIsOpen] = useState(false);
  const [isClosable, setIsClosable] = useState(false);
  const [secsRemaining, setSecsRemaining] = useState(90);
  const [resetCounter, setResetCounter] = useState(0);

  useNuiEvent("setSummonOpen", () => {
    setSecsRemaining(90);
    setResetCounter(0);
    setIsClosable(false);
    setIsOpen(true);
    openSound.play();
  });

  useNuiEvent<number>("pulseSummon", (secsRemaining) => {
    setSecsRemaining(secsRemaining);
    setIsMiniBounce(true);
    pulseSound.play();
    setTimeout(() => {
      setIsMiniBounce(false);
    }, 500);
  });

  useNuiEvent("setSummonClosable", () => {
    setIsClosable(true);
    setSecsRemaining(2);
  });

  useNuiEvent("resetSummon", () => {
    setSecsRemaining(2);
    setResetCounter((prev) => prev + 1);
    pulseSound.pause();
    pulseSound.currentTime = 0;
    openSound.pause();
    openSound.currentTime = 0;
    openSound.play();
  });

  useNuiEvent("closeSummon", () => {
    setIsOpen(false);
  });

  const exitHandler = () => {
    pulseSound.play();
  };

  return (
    <MainPageStyles>
      <Fade in={isOpen} onExit={exitHandler}>
        <Box
          className={
            !isMiniBounce ? mainClasses.root : `${mainClasses.root} ${mainClasses.miniBounce}`
          }
        >
          <SummonInnerComp
            secsRemaining={secsRemaining}
            resetCounter={resetCounter}
            isClosable={isClosable}
          />
        </Box>
      </Fade>
    </MainPageStyles>
  );
};