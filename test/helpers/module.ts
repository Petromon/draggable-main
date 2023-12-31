import {
  waitForDragDelay,
  clickMouse,
  moveMouse,
  releaseMouse,
  touchStart,
  touchMove,
  touchRelease,
  dragStart,
  dragOver,
  dragDrop,
  dragStop,
} from './sensor';

interface Options {
  from: HTMLElement;
  to: HTMLElement;
  sensor?: 'mouse' | 'touch' | 'drag';
}

export function drag({from, to, sensor = 'mouse'}: Options) {
  if (sensor === 'mouse') {
    clickMouse(from);
    waitForDragDelay();
    moveMouse(to);
    releaseMouse(to);
  } else if (sensor === 'touch') {
    touchStart(from);
    waitForDragDelay();
    touchMove(to);
    touchRelease(to);
  } else if (sensor === 'drag') {
    clickMouse(from);
    waitForDragDelay();
    dragStart(from);
    waitForDragDelay();
    dragOver(to);
    dragDrop(to);
    dragStop(to);
  } else {
    throw new Error(`Sensor '${sensor}' is not yet implemented`);
  }
}
