BEGIN;

WITH source_locations (
  source_place_id,
  name,
  location_type,
  city,
  district,
  address,
  lat,
  lng
) AS (
  VALUES
    ('ChIJQ1oSBAusNTER6ywTQp0BMWg', 'Trung tam The hinh BLUEGYM Vo Thi Sau', 'indoor_place', 'Ha Noi', 'Bach Mai', '101 P. Vo Thi Sau, Bach Mai, Ha Noi 10000, Vietnam', 21.0044039, 105.8551904),
    ('ChIJ6x0OHgSrNTER9US9VuRMos0', 'NoVa Fitness & Yoga Nguyen Luong Bang', 'indoor_place', 'Ha Noi', 'Dong Da', '187 Nguyen Luong Bang, Dong Da, Ha Noi, Vietnam', 21.0133818, 105.8276371),
    ('ChIJHSd5PiitNTERj3yGUV0NTSI', 'HPC Private Gym Studio - Co so 2', 'indoor_place', 'Ha Noi', 'P. Vo Thi Sau', 'Ngo 90 phuong, P. Vo Thi Sau, Bach Mai, Ha Noi 100000, Vietnam', 21.0042351, 105.8547059),
    ('ChIJM5-xP3WsNTERdzTejuLJtAg', 'AKC Fitness Bach Mai', 'indoor_place', 'Ha Noi', 'Tuong Mai', '30 Pho Nguyen An Ninh, Tuong Mai, Ha Noi 100000, Vietnam', 20.9888856, 105.8463628),
    ('ChIJDXiEZ2ysNTERE0cpmVYPvXk', 'RAMBO GYM 141 TRUONG DINH', 'indoor_place', 'Ha Noi', 'Tuong Mai', '141 Truong Dinh, Tuong Mai, Ha Noi, Vietnam', 20.9913018, 105.849577),
    ('ChIJJ8jIVH6sNTERo0LHdd76cRc', 'Elite Fitness Vincom Pham Ngoc Thach', 'indoor_place', 'Ha Noi', '2B P. Pham Ngoc Thach', 'Vincom Center, 2B P. Pham Ngoc Thach, Kim Lien, Ha Noi 100000, Vietnam', 21.0063704, 105.8321018),
    ('ChIJFZhjFnWtNTER5IEWJErJcbA', 'EMS Fitness & Yoga - Truong Chinh, Dong Da', 'indoor_place', 'Ha Noi', 'Kim Lien', '102 D. Truong Chinh, Kim Lien, Ha Noi 100000, Vietnam', 21.0009941, 105.8373936),
    ('ChIJOTiZPm6sNTER-DcRe4AvCDU', 'Phong gym Olympia', 'indoor_place', 'Ha Noi', 'Tuong Mai', '140 Tran Dai Nghia, Tuong Mai, Ha Noi 100000, Vietnam', 20.9954957, 105.8450512),
    ('ChIJMdwxpeKtNTER8fvfsynYFrg', 'New Fit Nguyen An Ninh', 'indoor_place', 'Ha Noi', 'Tuong Mai', '47 Ng. 104 P. Nguyen An Ninh, Tuong Mai, Ha Noi, Vietnam', 20.9918723, 105.8457501),
    ('ChIJdRB4NlGtNTERMiAUuYPBLc8', 'HUNG ANH GYM - Fitness & PT Coach', 'indoor_place', 'Ha Noi', '101 P. Nguyen Hien', '101 k11a, 101 P. Nguyen Hien, Khu tap the Bach Khoa, Bach Mai, Ha Noi 100000, Vietnam', 21.0006562, 105.8456827),
    ('ChIJ9wCtEgCtNTERfPXagVyop2c', 'HUNG ANH GYM - PRIVATE ZONE', 'indoor_place', 'Ha Noi', 'P. Nguyen Hien', '108k17, P. Nguyen Hien, Khu tap the Bach Khoa, Bach Mai, Ha Noi 10000, Vietnam', 21.0006657, 105.8462028),
    ('ChIJow7MmnCsNTER8OMNlq0t8r0', 'Bluegym Dinh Cong', 'indoor_place', 'Ha Noi', 'Phuong Liet', '360 D. Giai Phong, Phuong Liet, Ha Noi, Vietnam', 20.9859517, 105.8401741),
    ('ChIJnzwdThitNTERu3428PgKH0Q', 'GymMax Fitness Center', 'indoor_place', 'Ha Noi', 'Khu tap the Thuy Loi', 'Ngo 95 P. Chua Boc, Khu tap the Thuy Loi, Kim Lien, Ha Noi, Vietnam', 21.0052356, 105.8265838),
    ('ChIJw_QBKQCtNTERPibzRqB5A6Q', 'F4 Fitness & Yoga', 'indoor_place', 'Ha Noi', 'Kim Lien', '18 D. Giai Phong, Kim Lien, Ha Noi, Vietnam', 21.0062985, 105.8407585),
    ('ChIJN1fhbDetNTERjTM4UGH3d9A', 'Nuke Fitness', 'indoor_place', 'Ha Noi', 'Khu tap the Kim Lien', 'B14 P. Pham Ngoc Thach, Khu tap the Kim Lien, Kim Lien, Ha Noi 10000, Vietnam', 21.0082768, 105.834183),
    ('ChIJOdMeD3SsNTERJpKltEqmHPk', 'CLB Golden Gym Bach Khoa (CLB Gym Sinh vien)', 'indoor_place', 'Ha Noi', 'Bach Mai', 'A1 P. Le Thanh Nghi, Bach Mai, Ha Noi, Vietnam', 21.0026267, 105.8475195),
    ('ChIJ9zCMy7mtNTEROfHbCAp9NGM', 'AE FITNESS GYM', 'indoor_place', 'Ha Noi', 'Phuong Liet', '96 P. Dinh Cong, Phuong Liet, Ha Noi, Vietnam', 20.9846837, 105.8386233),
    ('ChIJvUoPhsStNTERg4ZtjsPboPA', 'Victory''s Gym Hoang Mai', 'indoor_place', 'Ha Noi', 'Tuong Mai', '74 D. Hoang Mai, Tuong Mai, Ha Noi, Vietnam', 20.99269, 105.8507609),
    ('ChIJazHpo9utNTER3caTZhAvMac', 'Mipec Fitness Center', 'indoor_place', 'Ha Noi', 'Phuong Liet', '9 P. Le Trong Tan, Phuong Liet, Ha Noi, Vietnam', 20.9914871, 105.8332269),
    ('ChIJMyxWPm-sNTER9CWPygJWcO8', 'Phong Tap Yoga', 'indoor_place', 'Ha Noi', 'Tuong Mai', '43 P. Tuong Mai, Tuong Mai, Ha Noi, Vietnam', 20.9919977, 105.8425755)
)

INSERT INTO airpath.locations (id, name, location_type, city, district, address, lat, lng)
SELECT
  lower(
    substr(md5(source_place_id), 1, 8) || '-' ||
    substr(md5(source_place_id), 9, 4) || '-' ||
    '4' || substr(md5(source_place_id), 14, 3) || '-' ||
    'a' || substr(md5(source_place_id), 18, 3) || '-' ||
    substr(md5(source_place_id), 21, 12)
  )::uuid,
  name,
  location_type,
  city,
  district,
  address,
  lat,
  lng
FROM source_locations
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  location_type = EXCLUDED.location_type,
  city = EXCLUDED.city,
  district = EXCLUDED.district,
  address = EXCLUDED.address,
  lat = EXCLUDED.lat,
  lng = EXCLUDED.lng;

COMMIT;
