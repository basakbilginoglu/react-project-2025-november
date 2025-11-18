/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useRef, useState } from "react";

import type { ScheduleInstance } from "../../models/schedule";
import type { UserInstance } from "../../models/user";

import FullCalendar from "@fullcalendar/react";

import interactionPlugin from "@fullcalendar/interaction";
import dayGridPlugin from "@fullcalendar/daygrid";

import type { EventInput } from "@fullcalendar/core/index.js";

import "../profileCalendar.scss";

import { useDispatch } from "react-redux";
import { updateScheduleAssignment } from "../../store/schedule/actions";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";

dayjs.extend(utc);
dayjs.extend(isSameOrBefore);

type CalendarContainerProps = {
  schedule: ScheduleInstance;
  auth: UserInstance;
};

const CalendarContainer = ({ schedule, auth }: CalendarContainerProps) => {
  const dispatch = useDispatch();
  const calendarRef = useRef<FullCalendar>(null);

  const [events, setEvents] = useState<EventInput[]>([]);
  const [highlightedDates, setHighlightedDates] = useState<string[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [pairHighlightMap, setPairHighlightMap] = useState<Record<string, string>>({});
  const [staffColorMap, setStaffColorMap] = useState<Record<string, string>>({});
  const [selectedEventDetail, setSelectedEventDetail] = useState<any | null>(null);
  const [initialDate, setInitialDate] = useState<Date>(
    dayjs(schedule?.scheduleStartDate).toDate()
  );

  const getPlugins = () => {
    const plugins = [dayGridPlugin];

    plugins.push(interactionPlugin);
    return plugins;
  };

  const getShiftById = (id: string) => {
    return schedule?.shifts?.find((shift: { id: string }) => id === shift.id);
  };

  const getAssigmentById = (id: string) => {
    return schedule?.assignments?.find((assign) => id === assign.id);
  };

  const validDates = () => {
    const dates = [];
    let currentDate = dayjs(schedule.scheduleStartDate);
    while (
      currentDate.isBefore(schedule.scheduleEndDate) ||
      currentDate.isSame(schedule.scheduleEndDate)
    ) {
      dates.push(currentDate.format("YYYY-MM-DD"));
      currentDate = currentDate.add(1, "day");
    }

    return dates;
  };

  const getDatesBetween = (startDate: string, endDate: string) => {
    const dates = [];
    const start = dayjs(startDate, "DD.MM.YYYY").toDate();
    const end = dayjs(endDate, "DD.MM.YYYY").toDate();
    const current = new Date(start);

    while (current <= end) {
      dates.push(dayjs(current).format("DD-MM-YYYY"));
      current.setDate(current.getDate() + 1);
    }

    return dates;
  };

  const parsePairDate = (dateStr?: string) => {
    if (!dateStr) return dayjs(NaN);
    const parts = dateStr.split(".");
    if (parts.length !== 3) return dayjs(NaN);
    const [day, month, year] = parts;
    return dayjs(`${year}-${month}-${day}`);
  };

  const computeStaffColor = (staffId: string) => {
    if (!schedule?.staffs || schedule.staffs.length === 0) return "#19979c";
    const index = schedule.staffs.findIndex((staff) => staff.id === staffId);
    if (index === -1) return "#19979c";

    const total = schedule.staffs.length;
    let hue = Math.round((360 / total) * index);
    const saturation = 70;
    const lightness = 50;

    const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    return ensureReadableHue(color);
  };

  const ensureReadableHue = (color: string) => {
    const match = color.match(/hsl\((\d+),\s*(\d+)%?,\s*(\d+)%?\)/i);
    if (!match) {
      return color;
    }
    const hue = Number(match[1]);
    const sat = Number(match[2]);
    let light = Number(match[3]);

    if (light > 65) light = 65;
    if (light < 30) light = 30;

    const contrast = getContrastRatioFromHsl(hue, sat, light);
    if (contrast < 4.5) {
      light = Math.min(light - 10, 65);
    }

    return `hsl(${hue}, ${sat}%, ${light}%)`;
  };

  const getContrastRatioFromHsl = (h: number, s: number, l: number) => {
    const { r, g, b } = hslToRgb(h / 360, s / 100, l / 100);
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const whiteLum = 1;
    const ratio =
      (Math.max(luminance, whiteLum) + 0.05) /
      (Math.min(luminance, whiteLum) + 0.05);
    return ratio;
  };

  const hslToRgb = (h: number, s: number, l: number) => {
    if (s === 0) {
      return { r: l, g: l, b: l };
    }
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const r = hue2rgb(p, q, h + 1 / 3);
    const g = hue2rgb(p, q, h);
    const b = hue2rgb(p, q, h - 1 / 3);
    return { r, g, b };
  };

  const generateStaffColors = () => {
    if (!schedule?.staffs) return;
    const colorMap: Record<string, string> = {};
    schedule.staffs.forEach((staff) => {
      colorMap[staff.id] = computeStaffColor(staff.id);
    });
    setStaffColorMap(colorMap);
  };

  const getStaffColor = (staffId: string) =>
    staffColorMap[staffId] || computeStaffColor(staffId);

  const getShiftAccentColor = (shiftId: string) => {
    const hash =
      shiftId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % 360;
    return `hsl(${hash}, 70%, 55%)`;
  };

  const generatePairHighlights = (staffId: string | null) => {
    if (!staffId || !schedule?.staffs) {
      setPairHighlightMap({});
      return;
    }

    const scheduleStart = dayjs(schedule.scheduleStartDate);
    const scheduleEnd = dayjs(schedule.scheduleEndDate);

    type HighlightEntry = {
      staffId: string;
      color: string;
      start: dayjs.Dayjs;
      end: dayjs.Dayjs;
    };

    const entries: HighlightEntry[] = [];

    schedule.staffs.forEach((staff) => {
      staff.pairList?.forEach((pair: any) => {
        const start = parsePairDate(pair.startDate);
        const end = parsePairDate(pair.endDate);
        if (!start.isValid() || !end.isValid()) return;

        // staff perspektifi: partner renginde göster
        entries.push({
          staffId: staff.id,
          color: getStaffColor(pair.staffId),
          start,
          end,
        });

        // partner perspektifi: staff renginde göster
        entries.push({
          staffId: pair.staffId,
          color: getStaffColor(staff.id),
          start,
          end,
        });
      });
    });

    const relevantEntries = entries.filter((entry) => entry.staffId === staffId);
    if (relevantEntries.length === 0) {
      setPairHighlightMap({});
      return;
    }

    const newPairHighlightMap: Record<string, string> = {};

    relevantEntries.forEach(({ color, start, end }) => {
      let cursor = start.clone();
      while (cursor.isSame(end, "day") || cursor.isBefore(end, "day")) {
        const withinSchedule =
          (cursor.isSame(scheduleStart, "day") ||
            cursor.isAfter(scheduleStart, "day")) &&
          (cursor.isSame(scheduleEnd, "day") ||
            cursor.isBefore(scheduleEnd, "day"));

        if (withinSchedule) {
          const key = cursor.format("DD-MM-YYYY");
          newPairHighlightMap[key] = color;
        }

        cursor = cursor.add(1, "day");
      }
    });

    setPairHighlightMap(newPairHighlightMap);
  };

  const generateStaffBasedCalendar = (staffId: string | null) => {
    if (!schedule || !staffId) {
      setEvents([]);
      setHighlightedDates([]);
      return;
    }

    const works: EventInput[] = [];

    const filteredAssignments = schedule?.assignments?.filter(
      (assign) => assign.staffId === staffId
    ) || [];

    for (let i = 0; i < filteredAssignments.length; i++) {
      const assignmentDate = dayjs
        .utc(filteredAssignments[i]?.shiftStart)
        .format("YYYY-MM-DD");
      const isValidDate = validDates().includes(assignmentDate);

      const work = {
        id: filteredAssignments[i]?.id,
        title: getShiftById(filteredAssignments[i]?.shiftId)?.name,
        duration: "01:00",
        date: assignmentDate,
        staffId: filteredAssignments[i]?.staffId,
        shiftId: filteredAssignments[i]?.shiftId,
        backgroundColor: getStaffColor(filteredAssignments[i]?.staffId),
        borderColor: getStaffColor(filteredAssignments[i]?.staffId),
        className: `event ${
          getAssigmentById(filteredAssignments[i]?.id)?.isUpdated
            ? "highlight"
            : ""
        } ${!isValidDate ? "invalid-date" : ""}`,
        extendedProps: {
          staffName:
            schedule.staffs.find(
              (st) => st.id === filteredAssignments[i]?.staffId
            )?.name || "",
          shiftName: getShiftById(filteredAssignments[i]?.shiftId)?.name,
          shiftStart: filteredAssignments[i]?.shiftStart,
          shiftEnd: filteredAssignments[i]?.shiftEnd,
          shiftAccentColor: getShiftAccentColor(
            filteredAssignments[i]?.shiftId
          ),
        },
      };
      works.push(work);
    }

    const offDays = schedule?.staffs?.find(
      (staff) => staff.id === staffId
    )?.offDays;
    const dates = getDatesBetween(
      dayjs(schedule.scheduleStartDate).format("DD.MM.YYYY"),
      dayjs(schedule.scheduleEndDate).format("DD.MM.YYYY")
    );
    let highlightedDates: string[] = [];

    dates.forEach((date) => {
      const transformedDate = dayjs(date, "DD-MM-YYYY").format("DD.MM.YYYY");
      if (offDays?.includes(transformedDate)) highlightedDates.push(date);
    });

    setHighlightedDates(highlightedDates);
    setEvents(works);
  };

  useEffect(() => {
    if (!schedule?.staffs || schedule.staffs.length === 0) return;
    const firstStaffId = schedule.staffs[0].id;
    setSelectedStaffId(firstStaffId);
    generateStaffColors();
    generateStaffBasedCalendar(firstStaffId);
    generatePairHighlights(firstStaffId);
  }, [schedule]);

  useEffect(() => {
    generateStaffBasedCalendar(selectedStaffId);
    generatePairHighlights(selectedStaffId);
  }, [selectedStaffId, staffColorMap]);

  const RenderEventContent = ({ eventInfo }: any) => {
    const accent = eventInfo.event.extendedProps.shiftAccentColor;
    return (
      <div className="event-content">
        <span
          className="event-shift-accent"
          style={{ backgroundColor: accent }}
        />
        <p>{eventInfo.event.title}</p>
      </div>
    );
  };

  return (
    <div className="calendar-section">
      <div className="calendar-wrapper">
        <div className="staff-list">
          {schedule?.staffs?.map((staff: any) => (
            <div
              key={staff.id}
              onClick={() => setSelectedStaffId(staff.id)}
              className={`staff ${
                staff.id === selectedStaffId ? "active" : ""
              }`}
            >
              <span
                className="staff-color-dot"
                style={{ backgroundColor: getStaffColor(staff.id) }}
              />
              <svg
                xmlns="http://www.w3.org/2000/svg"
                height="20px"
                viewBox="0 -960 960 960"
                width="20px"
              >
                <path d="M480-480q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47ZM160-160v-112q0-34 17-62.5t47-43.5q60-30 124.5-46T480-440q67 0 131.5 16T736-378q30 15 47 43.5t17 62.5v112H160Zm320-400q33 0 56.5-23.5T560-640q0-33-23.5-56.5T480-720q-33 0-56.5 23.5T400-640q0 33 23.5 56.5T480-560Zm160 228v92h80v-32q0-11-5-20t-15-14q-14-8-29.5-14.5T640-332Zm-240-21v53h160v-53q-20-4-40-5.5t-40-1.5q-20 0-40 1.5t-40 5.5ZM240-240h80v-92q-15 5-30.5 11.5T260-306q-10 5-15 14t-5 20v32Zm400 0H320h320ZM480-640Z" />
              </svg>
              <span>{staff.name}</span>
            </div>
          ))}
        </div>
        <FullCalendar
          ref={calendarRef}
          locale={auth.language}
          plugins={getPlugins()}
          contentHeight={400}
          handleWindowResize={true}
          selectable={true}
          editable={true}
          eventOverlap={true}
          eventDurationEditable={false}
          initialView="dayGridMonth"
          initialDate={initialDate}
          events={events}
          firstDay={1}
          dayMaxEventRows={4}
          fixedWeekCount={true}
          showNonCurrentDates={true}
          eventContent={(eventInfo: any) => (
            <RenderEventContent eventInfo={eventInfo} />
          )}
          eventClick={(info: any) => {
            const { extendedProps } = info.event;
            setSelectedEventDetail({
              staffName: extendedProps.staffName,
              shiftName: extendedProps.shiftName,
              date: dayjs(info.event.start).format("DD.MM.YYYY"),
              startTime: dayjs(extendedProps.shiftStart).format("HH:mm"),
              endTime: dayjs(extendedProps.shiftEnd).format("HH:mm"),
            });
          }}
          eventDrop={(info: any) => {
            const assignmentId = info.event.id as string;
            const originalAssignment = schedule.assignments.find(
              (a) => a.id === assignmentId
            );
            if (!originalAssignment || !info.event.start) return;

            const newDate = dayjs(info.event.start);
            const originalStart = dayjs(originalAssignment.shiftStart);
            const originalEnd = dayjs(originalAssignment.shiftEnd);

            const newShiftStart = newDate
              .hour(originalStart.hour())
              .minute(originalStart.minute())
              .second(originalStart.second())
              .millisecond(originalStart.millisecond())
              .toISOString();

            const newShiftEnd = newDate
              .hour(originalEnd.hour())
              .minute(originalEnd.minute())
              .second(originalEnd.second())
              .millisecond(originalEnd.millisecond())
              .toISOString();

            dispatch(
              updateScheduleAssignment({
                id: assignmentId,
                shiftStart: newShiftStart,
                shiftEnd: newShiftEnd,
              })
            );
          }}
          datesSet={(info: any) => {
            const prevButton = document.querySelector(
              ".fc-prev-button"
            ) as HTMLButtonElement;
            const nextButton = document.querySelector(
              ".fc-next-button"
            ) as HTMLButtonElement;

            if (
              calendarRef?.current?.getApi().getDate() &&
              !dayjs(schedule?.scheduleStartDate).isSame(
                calendarRef?.current?.getApi().getDate()
              )
            )
              setInitialDate(calendarRef?.current?.getApi().getDate());

            const startDiff = dayjs(info.start)
              .utc()
              .diff(
                dayjs(schedule.scheduleStartDate).subtract(1, "day").utc(),
                "days"
              );
            const endDiff = dayjs(dayjs(schedule.scheduleEndDate)).diff(
              info.end,
              "days"
            );
            if (startDiff < 0 && startDiff > -35) prevButton.disabled = true;
            else prevButton.disabled = false;

            if (endDiff < 0 && endDiff > -32) nextButton.disabled = true;
            else nextButton.disabled = false;
          }}
          dayCellContent={({ date }) => {
            const found = validDates().includes(
              dayjs(date).format("YYYY-MM-DD")
            );
            const isHighlighted = highlightedDates.includes(
              dayjs(date).format("DD-MM-YYYY")
            );
            const dateKey = dayjs(date).format("DD-MM-YYYY");
            const pairColor = pairHighlightMap[dateKey];
            const isPairDay = !!pairColor;

            return (
              <div
                className={`${found ? "" : "date-range-disabled"} ${
                  isHighlighted ? "highlighted-date-orange" : ""
                } ${isPairDay ? "highlightedPair" : ""}`}
                style={
                  isPairDay
                    ? {
                        borderBottom: `4px solid ${pairColor}`,
                      }
                    : undefined
                }
              >
                {dayjs(date).date()}
              </div>
            );
          }}
        />
      </div>
      {selectedEventDetail && (
        <div className="event-detail-modal">
          <div className="event-detail-content">
            <button
              className="event-detail-close"
              onClick={() => setSelectedEventDetail(null)}
            >
              ×
            </button>
            <h3>Event Details</h3>
            <p>
              <strong>Personel:</strong> {selectedEventDetail.staffName}
            </p>
            <p>
              <strong>Vardiya:</strong> {selectedEventDetail.shiftName}
            </p>
            <p>
              <strong>Tarih:</strong> {selectedEventDetail.date}
            </p>
            <p>
              <strong>Başlangıç:</strong> {selectedEventDetail.startTime}
            </p>
            <p>
              <strong>Bitiş:</strong> {selectedEventDetail.endTime}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarContainer;
