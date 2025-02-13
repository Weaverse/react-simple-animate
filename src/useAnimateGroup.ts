import * as React from 'react';
import createRandomName from './utils/createRandomName';
import createArrayWithNumbers from './utils/createArrayWithNumbers';
import calculateTotalDuration from './utils/calculateTotalDuration';
import createTag from './logic/createTag';
import deleteRules from './logic/deleteRules';
import { HookSequences } from './types';
import {
  ALL,
  DEFAULT_DIRECTION,
  DEFAULT_DURATION,
  DEFAULT_EASE_TYPE,
  DEFAULT_FILLMODE,
  RUNNING,
} from './constants';

interface Props {
  sequences: HookSequences;
}

export default function useAnimateGroup(props: Props): {
  styles: (React.CSSProperties | null)[];
  play: (boolean) => void;
  isPlaying: boolean;
} {
  const { sequences = [] } = props;
  const defaultArray = createArrayWithNumbers(sequences.length).map(
    (_, index) => props.sequences[index].start,
  ) as React.CSSProperties[];
  const [styles, setStyles] = React.useState(defaultArray);
  const [isPlaying, setPlaying] = React.useState(false);
  const animationNamesRef = React.useRef<
    { forward: string; reverse: string }[]
  >([]);
  const styleTagRef = React.useRef<
    { forward?: HTMLStyleElement; reverse?: HTMLStyleElement }[]
  >([]);

  React.useEffect(() => {
    sequences.forEach(({ keyframes }, i) => {
      if (!Array.isArray(keyframes)) {
        return;
      }

      if (!animationNamesRef.current[i]) {
        animationNamesRef.current[i] = {} as any;
        styleTagRef.current[i] = {};
      }

      animationNamesRef.current[i].forward = createRandomName();
      let result = createTag({
        animationName: animationNamesRef.current[i].forward,
        keyframes,
      });
      styleTagRef.current[i].forward = result.styleTag;

      animationNamesRef.current[i].reverse = createRandomName();
      result = createTag({
        animationName: animationNamesRef.current[i].reverse,
        keyframes: keyframes.reverse(),
      });
      styleTagRef.current[i].reverse = result.styleTag;
    });

    const styleTags = styleTagRef.current;
    const animationNames = animationNamesRef.current;

    return () =>
      Object.values(animationNames).forEach(({ forward, reverse }, i) => {
        deleteRules(styleTags[i].forward?.sheet, forward);
        deleteRules(styleTags[i].reverse?.sheet, reverse);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const play = React.useCallback((isPlay: boolean) => {
    let totalDuration = 0;
    const animationRefWithOrder = isPlay
      ? animationNamesRef.current
      : [...animationNamesRef.current].reverse();
    const styles = (isPlay ? sequences : [...sequences].reverse()).map(
      (current, currentIndex): React.CSSProperties => {
        const {
          duration = DEFAULT_DURATION,
          delay = 0,
          overlay,
          keyframes,
          iterationCount = 1,
          easeType = DEFAULT_EASE_TYPE,
          direction = DEFAULT_DIRECTION,
          fillMode = DEFAULT_FILLMODE,
          end = {},
          start = {},
        } = current;
        const delayDuration = currentIndex === 0 ? delay : totalDuration;
        const transition = `${ALL} ${duration}s ${easeType} ${delayDuration}s`;
        totalDuration =
          calculateTotalDuration({ duration, delay, overlay }) + totalDuration;

        return keyframes
          ? {
              animation: `${duration}s ${easeType} ${delayDuration}s ${iterationCount} ${direction} ${fillMode} ${RUNNING} ${
                isPlay
                  ? animationRefWithOrder[currentIndex].forward
                  : animationRefWithOrder[currentIndex].reverse
              }`,
            }
          : {
              ...(isPlay ? end : start),
              transition,
            };
      },
    );

    setStyles(isPlay ? styles : [...styles].reverse());
    setPlaying(isPlay);
  }, []);

  return { styles, play, isPlaying };
}
