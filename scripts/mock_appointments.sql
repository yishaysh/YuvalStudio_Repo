-- ==========================================
-- SCRIPT: add_mock_appointments_for_screenshot.sql
-- PURPOSE: Insert 3 mock appointments for tomorrow to demonstrate the "Tomorrow's Preparations" widget.
-- HOW TO USE: Run this in your Supabase SQL Editor.
-- ==========================================

-- Insert 3 mock appointments for tomorrow
INSERT INTO public.appointments (
    client_name, 
    client_email, 
    client_phone, 
    service_id, 
    service_name, 
    start_time, 
    end_time,
    status, 
    notes
)
VALUES 
    (
        'לקוחה לדוגמה (הליקס)', 
        'mock1@studio.com', 
        '050-0000001', 
        (SELECT id FROM public.services WHERE name ILIKE '%הליקס%' LIMIT 1), 
        'הליקס / סחוס', 
        (CURRENT_DATE + interval '1 day' + time '12:00:00') AT TIME ZONE 'UTC', 
        (CURRENT_DATE + interval '1 day' + time '12:30:00') AT TIME ZONE 'UTC',
        'confirmed', 
        '[MOCK_FOR_SCREENSHOT]'
    ),
    (
        'לקוחה לדוגמה (נזם)', 
        'mock2@studio.com', 
        '050-0000002', 
        (SELECT id FROM public.services WHERE name ILIKE '%נזם%' LIMIT 1), 
        'נזם', 
        (CURRENT_DATE + interval '1 day' + time '13:00:00') AT TIME ZONE 'UTC', 
        (CURRENT_DATE + interval '1 day' + time '13:30:00') AT TIME ZONE 'UTC',
        'confirmed', 
        '[MOCK_FOR_SCREENSHOT]'
    ),
    (
        'לקוחה לדוגמה (אינדסטריאל)', 
        'mock3@studio.com', 
        '050-0000003', 
        (SELECT id FROM public.services WHERE name ILIKE '%אינדסטריאל%' LIMIT 1), 
        'אינדסטריאל', 
        (CURRENT_DATE + interval '1 day' + time '15:00:00') AT TIME ZONE 'UTC', 
        (CURRENT_DATE + interval '1 day' + time '16:00:00') AT TIME ZONE 'UTC',
        'confirmed', 
        '[MOCK_FOR_SCREENSHOT]'
    );

-- ==========================================
-- SCRIPT: remove_mock_appointments_for_screenshot.sql
-- PURPOSE: Delete the mock appointments we just created.
-- HOW TO USE: Run this in your Supabase SQL Editor AFTER taking the screenshot.
-- ==========================================

/* 
-- UNCOMMENT THIS BLOCK TO DELETE THE MOCKS
DELETE FROM public.appointments
WHERE notes LIKE '%[MOCK_FOR_SCREENSHOT]%';
*/
