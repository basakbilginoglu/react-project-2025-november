/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useRef, useState } from "react";
import type { ScheduleInstance } from "../../models/schedule";
import type { UserInstance } from "../../models/user";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventInput } from "@fullcalendar/core/index.js";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";

import { useDispatch } from "react-redux";
import { updateScheduleAssignment } from "../../store/schedule/actions";

import "../profileCalendar.scss";

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
  const [selectedPairDetail, setSelectedPairDetail] = useState<any | null>(null);
  const [initialDate, setInitialDate] = useState<Date>(
    schedule ? dayjs(schedule.scheduleStartDate).toDate() : new Date()
  );


  const isLoading = !schedule || !schedule.staffs || schedule.staffs.length === 0;

 
  const getPlugins = () => [dayGridPlugin, interactionPlugin];

  const getShiftById = (id: string) => schedule?.shifts?.find((shift) => shift.id === id);
  const getAssignmentById = (id: string) => schedule?.assignments?.find((assign) => assign.id === id);

  const validDates = () => {
    const dates: string[] = [];
    let currentDate = dayjs(schedule.scheduleStartDate);
    while (currentDate.isSameOrBefore(schedule.scheduleEndDate)) {
      dates.push(currentDate.format("YYYY-MM-DD"));
      currentDate = currentDate.add(1, "day");
    }
    return dates;
  };

  const getDatesBetween = (startDate: string, endDate: string) => {
    const dates: string[] = [];
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
    if (!schedule?.staffs || schedule.staffs.length === 0) return "#1a7f83";
    const index = schedule.staffs.findIndex((staff) => staff.id === staffId);
    if (index === -1) return "#1a7f83";
    
  
    const distinctColors = [
      'hsl(0, 80%, 42%)',     // Kırmızı
      'hsl(30, 85%, 45%)',    // Turuncu
      'hsl(60, 78%, 40%)',    // Altın Sarı
      'hsl(90, 75%, 38%)',    // Yeşil-Sarı
      'hsl(120, 80%, 35%)',   // Yeşil
      'hsl(150, 82%, 38%)',   // Deniz Yeşili
      'hsl(180, 85%, 40%)',   // Cyan
      'hsl(210, 80%, 42%)',   // Açık Mavi
      'hsl(240, 78%, 45%)',   // Mavi
      'hsl(270, 82%, 43%)',   // Mor
      'hsl(300, 80%, 40%)',   // Magenta
      'hsl(330, 85%, 42%)',   // Pembe
      'hsl(15, 75%, 38%)',    // Koyu Turuncu
      'hsl(45, 80%, 42%)',    // Hardal
      'hsl(75, 78%, 40%)',    // Limon Yeşili
      'hsl(105, 82%, 36%)',   // Çimen Yeşili
      'hsl(135, 80%, 38%)',   // Jade
      'hsl(165, 85%, 40%)',   // Turkuaz
      'hsl(195, 78%, 43%)',   // Gök Mavisi
      'hsl(225, 80%, 44%)',   // Kraliyet Mavisi
      'hsl(255, 82%, 42%)',   // İndigo
      'hsl(285, 78%, 41%)',   // Eflatun
      'hsl(315, 85%, 40%)',   // Fuşya
      'hsl(345, 80%, 43%)',   // Kızıl
      'hsl(20, 82%, 40%)',    // Kiremit
      'hsl(50, 75%, 38%)',    // Zeytin Sarısı
      'hsl(80, 80%, 37%)',    // Fıstık Yeşili
      'hsl(110, 78%, 39%)',   // Nane Yeşili
      'hsl(140, 85%, 36%)',   // Zümrüt
      'hsl(170, 80%, 41%)',   // Petrol Mavisi
      'hsl(200, 82%, 40%)',   // Derin Mavi
      'hsl(230, 78%, 46%)',   // Safir
      'hsl(260, 85%, 41%)',   // Menekşe
      'hsl(290, 80%, 42%)',   // Orkide
      'hsl(320, 82%, 39%)',   // Şeftali
      'hsl(350, 78%, 44%)',   // Mercan
    ];
    
    return distinctColors[index % distinctColors.length];
  };

  const getStaffColor = (staffId: string) => staffColorMap[staffId] || computeStaffColor(staffId);

  const getShiftAccentColor = (assignmentId: string, shiftId: string) => {
   
    const combinedString = `${assignmentId}-${shiftId}-${Date.now()}`;
    const hash = combinedString.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
   
    const accentColors = [
      'hsl(10, 90%, 52%)',
      'hsl(35, 88%, 54%)',
      'hsl(55, 85%, 50%)',
      'hsl(85, 90%, 48%)',
      'hsl(115, 88%, 50%)',
      'hsl(145, 92%, 52%)',
      'hsl(175, 90%, 54%)',
      'hsl(205, 88%, 53%)',
      'hsl(235, 90%, 51%)',
      'hsl(265, 92%, 50%)',
      'hsl(295, 88%, 52%)',
      'hsl(325, 90%, 54%)',
      'hsl(355, 92%, 53%)',
      'hsl(25, 88%, 51%)',
      'hsl(70, 90%, 49%)',
      'hsl(100, 85%, 52%)',
      'hsl(130, 92%, 48%)',
      'hsl(160, 88%, 54%)',
      'hsl(190, 90%, 52%)',
      'hsl(220, 92%, 50%)',
      'hsl(250, 88%, 53%)',
      'hsl(280, 90%, 51%)',
      'hsl(310, 92%, 49%)',
      'hsl(340, 88%, 54%)',
    ];
    
    return accentColors[hash % accentColors.length];
  };

 
  const generatePairHighlights = (staffId: string | null) => {
    if (!staffId || !schedule?.staffs) { setPairHighlightMap({}); return; }

    const scheduleStart = dayjs(schedule.scheduleStartDate);
    const scheduleEnd = dayjs(schedule.scheduleEndDate);

    const entries: { staffId: string; color: string; start: dayjs.Dayjs; end: dayjs.Dayjs; pairStaffId: string }[] = [];

    schedule.staffs.forEach((staff) => {
      staff.pairList?.forEach((pair: any) => {
        const start = parsePairDate(pair.startDate);
        const end = parsePairDate(pair.endDate);
        if (!start.isValid() || !end.isValid()) return;
        entries.push({ staffId: staff.id, color: getStaffColor(pair.staffId), start, end, pairStaffId: pair.staffId });
        entries.push({ staffId: pair.staffId, color: getStaffColor(staff.id), start, end, pairStaffId: staff.id });
      });
    });

    const relevantEntries = entries.filter((entry) => entry.staffId === staffId);
    if (relevantEntries.length === 0) { setPairHighlightMap({}); return; }

    const newPairHighlightMap: Record<string, string> = {};
    relevantEntries.forEach(({ color, start, end }) => {
      let cursor = start.clone();
      while (cursor.isSame(end, "day") || cursor.isBefore(end, "day")) {
        if ((cursor.isSame(scheduleStart, "day") || cursor.isAfter(scheduleStart, "day")) &&
            (cursor.isSame(scheduleEnd, "day") || cursor.isBefore(scheduleEnd, "day"))) {
          newPairHighlightMap[cursor.format("DD-MM-YYYY")] = color;
        }
        cursor = cursor.add(1, "day");
      }
    });

    setPairHighlightMap(newPairHighlightMap);
  };

  const getPairInfoForDate = (targetDate: dayjs.Dayjs) => {
    if (!selectedStaffId || !schedule?.staffs) return null;

    console.log("Getting pair info for:", targetDate.format("DD-MM-YYYY"));
    console.log("Selected staff ID:", selectedStaffId);

 
    const currentStaff = schedule.staffs.find(s => s.id === selectedStaffId);
    if (currentStaff?.pairList) {
      for (const pair of currentStaff.pairList) {
        const start = parsePairDate(pair.startDate);
        const end = parsePairDate(pair.endDate);
        
        if (!start.isValid() || !end.isValid()) continue;
        
        if ((targetDate.isSame(start, "day") || targetDate.isAfter(start, "day")) &&
            (targetDate.isSame(end, "day") || targetDate.isBefore(end, "day"))) {
          const pairStaff = schedule.staffs.find(s => s.id === pair.staffId);
          return {
            pairStaffName: pairStaff?.name || "Bilinmiyor",
            pairStaffColor: getStaffColor(pair.staffId),
            startDate: start.format("DD.MM.YYYY"),
            endDate: end.format("DD.MM.YYYY"),
            date: targetDate.format("DD.MM.YYYY")
          };
        }
      }
    }

    
    for (const staff of schedule.staffs) {
      if (staff.id === selectedStaffId) continue;
      
      if (staff.pairList) {
        for (const pair of staff.pairList) {
          if (pair.staffId === selectedStaffId) {
            const start = parsePairDate(pair.startDate);
            const end = parsePairDate(pair.endDate);
            
            if (!start.isValid() || !end.isValid()) continue;
            
            if ((targetDate.isSame(start, "day") || targetDate.isAfter(start, "day")) &&
                (targetDate.isSame(end, "day") || targetDate.isBefore(end, "day"))) {
              return {
                pairStaffName: staff.name || "Bilinmiyor",
                pairStaffColor: getStaffColor(staff.id),
                startDate: start.format("DD.MM.YYYY"),
                endDate: end.format("DD.MM.YYYY"),
                date: targetDate.format("DD.MM.YYYY")
              };
            }
          }
        }
      }
    }

    console.log("No pair found for this date");
    return null;
  };

  
  const generateStaffBasedCalendar = (staffId: string | null) => {
    if (!schedule || !staffId) { setEvents([]); setHighlightedDates([]); return; }

    const works: EventInput[] = [];
    const filteredAssignments = schedule.assignments?.filter((a) => a.staffId === staffId) || [];

    filteredAssignments.forEach((assignment) => {
      const assignmentDate = dayjs.utc(assignment.shiftStart).format("YYYY-MM-DD");
      const isValidDate = validDates().includes(assignmentDate);

      works.push({
        id: assignment.id,
        title: getShiftById(assignment.shiftId)?.name,
        date: assignmentDate,
        backgroundColor: getStaffColor(assignment.staffId),
        borderColor: getStaffColor(assignment.staffId),
        className: `event ${getAssignmentById(assignment.id)?.isUpdated ? "highlight" : ""} ${!isValidDate ? "invalid-date" : ""}`,
        extendedProps: {
          staffName: schedule.staffs.find((st) => st.id === assignment.staffId)?.name || "",
          shiftName: getShiftById(assignment.shiftId)?.name,
          shiftStart: assignment.shiftStart,
          shiftEnd: assignment.shiftEnd,
          shiftAccentColor: getShiftAccentColor(assignment.id, assignment.shiftId)
        }
      });
    });

    const offDays = schedule.staffs.find((s) => s.id === staffId)?.offDays;
    const dates = getDatesBetween(dayjs(schedule.scheduleStartDate).format("DD.MM.YYYY"), dayjs(schedule.scheduleEndDate).format("DD.MM.YYYY"));
    const highlighted: string[] = [];
    dates.forEach((date) => {
      if (offDays?.includes(dayjs(date, "DD-MM-YYYY").format("DD.MM.YYYY"))) highlighted.push(date);
    });

    setHighlightedDates(highlighted);
    setEvents(works);
  };

  
  useEffect(() => {
    if (isLoading) return;

    if (!selectedStaffId) {
      const firstStaff = schedule.staffs[0].id;
      setSelectedStaffId(firstStaff);
    }

    const colorMap: Record<string, string> = {};
    const distinctColors = [
      'hsl(0, 80%, 42%)',     'hsl(30, 85%, 45%)',    'hsl(60, 78%, 40%)',
      'hsl(90, 75%, 38%)',    'hsl(120, 80%, 35%)',   'hsl(150, 82%, 38%)',
      'hsl(180, 85%, 40%)',   'hsl(210, 80%, 42%)',   'hsl(240, 78%, 45%)',
      'hsl(270, 82%, 43%)',   'hsl(300, 80%, 40%)',   'hsl(330, 85%, 42%)',
      'hsl(15, 75%, 38%)',    'hsl(45, 80%, 42%)',    'hsl(75, 78%, 40%)',
      'hsl(105, 82%, 36%)',   'hsl(135, 80%, 38%)',   'hsl(165, 85%, 40%)',
      'hsl(195, 78%, 43%)',   'hsl(225, 80%, 44%)',   'hsl(255, 82%, 42%)',
      'hsl(285, 78%, 41%)',   'hsl(315, 85%, 40%)',   'hsl(345, 80%, 43%)',
      'hsl(20, 82%, 40%)',    'hsl(50, 75%, 38%)',    'hsl(80, 80%, 37%)',
      'hsl(110, 78%, 39%)',   'hsl(140, 85%, 36%)',   'hsl(170, 80%, 41%)',
      'hsl(200, 82%, 40%)',   'hsl(230, 78%, 46%)',   'hsl(260, 85%, 41%)',
      'hsl(290, 80%, 42%)',   'hsl(320, 82%, 39%)',   'hsl(350, 78%, 44%)',
    ];
    
    schedule.staffs.forEach((staff, index) => {
      colorMap[staff.id] = distinctColors[index % distinctColors.length];
    });
    setStaffColorMap(colorMap);

    // Mevcut seçili staff'ı kullan
    generateStaffBasedCalendar(selectedStaffId || schedule.staffs[0].id);
    generatePairHighlights(selectedStaffId || schedule.staffs[0].id);
  }, [schedule]);

  useEffect(() => {
    if (isLoading) return;
    generateStaffBasedCalendar(selectedStaffId);
    generatePairHighlights(selectedStaffId);
  }, [selectedStaffId, staffColorMap]);


  if (isLoading) return <div className="calendar-section">Loading...</div>;

  const RenderEventContent = ({ eventInfo }: any) => {
    const accent = eventInfo.event.extendedProps.shiftAccentColor;
    return (
      <div 
        className="event-content" 
        style={{ 
          display: "flex", 
          alignItems: "center", 
          height: "100%",
          padding: "4px 6px",
          position: "relative",
          overflow: "hidden"
        }}
      >
        {/* Diagonal stripe pattern background */}
        <div 
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: `repeating-linear-gradient(
              45deg,
              ${accent}00,
              ${accent}00 8px,
              ${accent}15 8px,
              ${accent}15 12px
            )`,
            pointerEvents: "none",
            zIndex: 0
          }}
        />
        
        {/* Left accent bar with glow */}
        <div 
          style={{ 
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: "4px",
            backgroundColor: accent,
            boxShadow: `2px 0 8px ${accent}80`,
            zIndex: 1
          }} 
        />
        
        {/* Text content */}
        <p 
          style={{ 
            margin: 0, 
            padding: "0 0 0 12px",
            lineHeight: "1.3em", 
            flex: 1, 
            color: "#ffffff", 
            fontWeight: "600",
            textShadow: "0 1px 2px rgba(0,0,0,0.3)",
            fontSize: "0.85rem",
            letterSpacing: "0.3px",
            position: "relative",
            zIndex: 2
          }}
        >
          {eventInfo.event.title}
        </p>
        
        {/* Right corner accent */}
        <div 
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            width: "24px",
            height: "24px",
            background: `linear-gradient(135deg, transparent 50%, ${accent}40 50%)`,
            borderRadius: "0 0 0 100%",
            zIndex: 1
          }}
        />
      </div>
    );
  };

  return (
    <div className="calendar-section">
      <div className="calendar-wrapper">
        <div className="staff-list">
          {schedule.staffs.map((staff) => (
            <div key={staff.id} onClick={() => setSelectedStaffId(staff.id)} className={`staff ${staff.id === selectedStaffId ? "active" : ""}`}>
              <span className="staff-color-dot" style={{ backgroundColor: getStaffColor(staff.id) }} />
              <span>{staff.name}</span>
            </div>
          ))}
        </div>

        <FullCalendar
          ref={calendarRef}
          locale={auth.language}
          plugins={getPlugins()}
          contentHeight={400}
          initialView="dayGridMonth"
          initialDate={initialDate}
          events={events}
          editable={true}
          eventDurationEditable={false}
          eventContent={(info) => <RenderEventContent eventInfo={info} />}
          eventClick={(info) => {
            const { extendedProps } = info.event;
            setSelectedEventDetail({
              staffName: extendedProps.staffName,
              shiftName: extendedProps.shiftName,
              date: dayjs(info.event.start).format("DD.MM.YYYY"),
              startTime: dayjs(extendedProps.shiftStart).format("HH:mm"),
              endTime: dayjs(extendedProps.shiftEnd).format("HH:mm"),
            });
          }}
          eventDrop={(info) => {
            const assignmentId = info.event.id as string;
            const original = schedule.assignments.find((a) => a.id === assignmentId);
            if (!original || !info.event.start) return;

            const newDate = dayjs(info.event.start);
            const originalStart = dayjs(original.shiftStart);
            const originalEnd = dayjs(original.shiftEnd);

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

            dispatch(updateScheduleAssignment({ id: assignmentId, shiftStart: newShiftStart, shiftEnd: newShiftEnd }));
          }}
          dateClick={(info) => {
            // info.date zaten bir Date objesi, onu dayjs'e çeviriyoruz
            const clickedDate = dayjs(info.date);
            const dateKey = clickedDate.format("DD-MM-YYYY");
            const isPairDay = !!pairHighlightMap[dateKey];
            
            console.log("Date clicked:", dateKey);
            console.log("Is pair day:", isPairDay);
            
            if (isPairDay) {
              const pairInfo = getPairInfoForDate(clickedDate);
              console.log("Pair info:", pairInfo);
              if (pairInfo) {
                setSelectedPairDetail(pairInfo);
              }
            }
          }}
          dayCellContent={({ date }) => {
            const found = validDates().includes(dayjs(date).format("YYYY-MM-DD"));
            const isHighlighted = highlightedDates.includes(dayjs(date).format("DD-MM-YYYY"));
            const dateKey = dayjs(date).format("DD-MM-YYYY");
            const pairColor = pairHighlightMap[dateKey];
            const isPairDay = !!pairColor;
            return (
              <div
                className={`${found ? "" : "date-range-disabled"} ${isHighlighted ? "highlighted-date-orange" : ""} ${isPairDay ? "highlightedPair" : ""}`}
                style={isPairDay ? { borderBottom: `4px solid ${pairColor}`, cursor: "pointer" } : undefined}
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
            <button className="event-detail-close" onClick={() => setSelectedEventDetail(null)}>×</button>
            <h3>Event Details</h3>
            <p><strong>Personel:</strong> {selectedEventDetail.staffName}</p>
            <p><strong>Vardiya:</strong> {selectedEventDetail.shiftName}</p>
            <p><strong>Tarih:</strong> {selectedEventDetail.date}</p>
            <p><strong>Başlangıç:</strong> {selectedEventDetail.startTime}</p>
            <p><strong>Bitiş:</strong> {selectedEventDetail.endTime}</p>
          </div>
        </div>
      )}

      {selectedPairDetail && (
        <div className="event-detail-modal" onClick={() => setSelectedPairDetail(null)}>
          <div className="event-detail-content" onClick={(e) => e.stopPropagation()}>
            <button className="event-detail-close" onClick={() => setSelectedPairDetail(null)}>×</button>
            <h3 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ 
                width: "16px", 
                height: "16px", 
                borderRadius: "50%", 
                backgroundColor: selectedPairDetail.pairStaffColor,
                display: "inline-block",
                border: "2px solid #fff",
                boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
              }} />
              Pair Bilgisi
            </h3>
            <p><strong>Eş:</strong> {selectedPairDetail.pairStaffName}</p>
            <p><strong>Tarih:</strong> {selectedPairDetail.date}</p>
            <p><strong>Başlangıç:</strong> {selectedPairDetail.startDate}</p>
            <p><strong>Bitiş:</strong> {selectedPairDetail.endDate}</p>
            <div style={{ 
              marginTop: "12px", 
              padding: "8px 12px", 
              backgroundColor: `${selectedPairDetail.pairStaffColor}20`,
              borderLeft: `3px solid ${selectedPairDetail.pairStaffColor}`,
              borderRadius: "4px",
              fontSize: "0.9rem"
            }}>
              Bu tarihte <strong>{selectedPairDetail.pairStaffName}</strong> ile eş olarak çalışılıyor.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarContainer;