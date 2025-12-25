import React, { useState } from "react";
import { styled } from '@mui/material/styles';
import { Box, Fade, Typography } from "@mui/material";
import { useNuiEvent } from "../../hooks/useNuiEvent";
import { useTranslate } from "react-polyglot";
import { ImportantDevices } from "@mui/icons-material";

/**
 * Summon box styles
 */
const boxClasses = {
  root: `SummonBox-root`,
  inner: `SummonBox-inner`,
  title: `SummonBox-title`,
  message: `SummonBox-message`,
  author: `SummonBox-author`,
  instruction: `SummonBox-instruction`
};

const SummonInnerStyles = styled('div')({
  color: "whitesmoke",
  transition: "transform 300ms ease-in-out",
  maxWidth: "900px",

  [`& .${boxClasses.inner}`]: {
    padding: 32,
    border: "3px dashed whitesmoke",
    borderRadius: 12,
  },
  [`& .${boxClasses.title}`]: {
    display: "flex",
    margin: "-20px auto 18px auto",
    width: "max-content",
    borderBottom: "2px solid whitesmoke",
    paddingBottom: 5,
    fontWeight: 700,
  },
  [`& .${boxClasses.message}`]: {
    fontSize: "1.5em",
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
  <ImportantDevices
    style={{
      color: "skyblue",
      padding: "0 4px 0 4px",
      height: "3rem",
      width: "3rem",
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
  </span>

  return (<>
    <SummonInnerStyles className={boxClasses.root}>
      <Box className={boxClasses.inner}>
        <Box className={boxClasses.title}>
          <SummonIcon />
          <Typography variant="h3" style={{ fontWeight: 700 }}>
            PC Check
          </Typography>
          <SummonIcon />
        </Box>
        <Typography
          letterSpacing={1}
          variant="h5"
          style={{
            textAlign: "center",
          }}
        >
          You have been selected for a PC check. Please enter the "Waiting for PC Check" state immediately.<br />
          Do not delete any files or exit the game during the check.<br />
          Please keep a recording starting from the moment you see this message until the check is complete.<br />
          Thank you for your cooperation.
        </Typography>
        <hr />
        <Typography
          letterSpacing={1}
          variant="h5"
          style={{
            textAlign: "center",
          }}
        >
          אתה זומן לבדיקה במחשב. אנא היכנס למצב "Waiting for PC Check" מיד.<br />
          אסור למחוק קבצים או לצאת מהמשחק בזמן הבדיקה.<br />
          אנא שמור רישום (רקורד) מהשנייה שבה אתה רואה הודעה זו ועד סיום הבדיקה.<br />
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
  </>);
};


/**
 * Main summon container (whole page)
 */
const mainClasses = {
  root: `MainSummon-root`,
  miniBounce: `MainSummon-miniBounce`,
}

const MainPageStyles = styled('div')(({
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
    backgroundColor: "rgba(3, 3, 133, 0.95)",
  },
  "@keyframes miniBounce": {
    "0%": {
      backgroundColor: "rgba(3, 3, 133, 0.95)",
    },
    "30%": {
      backgroundColor: "rgba(3, 3, 133, 0.60)",
    },
    "60%": {
      backgroundColor: "rgba(3, 3, 133, 0.30)",
    },
    "70%": {
      backgroundColor: "rgba(3, 3, 133, 0.60)",
    },
    "100%": {
      backgroundColor: "rgba(3, 3, 133, 0.95)",
    },
  },
  [`& .${mainClasses.miniBounce}`]: {
    animation: "miniBounce 500ms ease-in-out",
  },
}));

const pulseSound = new Audio("sounds/warning_pulse.mp3");
const openSound = new Audio("sounds/warning_open.mp3");

export const SummonPage: React.FC = ({ }) => {
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
