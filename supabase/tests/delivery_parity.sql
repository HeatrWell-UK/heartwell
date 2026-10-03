-- Produces the data in tests/fixtures/delivery-parity.json: the database's own
-- answers for a spread of postcodes and every combination of delivery extras
-- (with the default shop_settings). The TypeScript copies in src/lib/delivery
-- must match them; tests/delivery-parity.test.ts checks that they do.
--
-- Run it after changing classify_postcode or quote_delivery, and paste the two
-- columns into the fixture's "delivery" and "postcodes" arrays.

select
  (select string_agg(format('[%s,%s,%s,%s,%s,%s,%s,%s,%s,%s]', f, l, a, r, coalesce(s::text, 'null'),
      (q->>'upstairs')::numeric::int, (q->>'assembly')::numeric::int, coalesce(q->>'removal_seats', 'null'),
      (q->>'removal')::numeric::int, (q->>'total')::numeric::int), ',' order by f, l, a, r, s nulls first)
   from generate_series(0, 4) f,
        (values (false), (true)) lv(l),
        (values (false), (true)) av(a),
        (values (false), (true)) rv(r),
        (values (null::integer), (0), (1), (3), (10), (15)) sv(s),
        lateral (select public.quote_delivery(f, l, a, r, s) as q) x
   where r or s is null) as delivery,
  (select string_agg(format('[%s,%s,%s,%s,%s]', to_jsonb(c.input), coalesce(to_jsonb(c.ev)::text, 'null'),
      to_jsonb(res->>'kind'), coalesce(to_jsonb(res->>'zone')::text, 'null'), to_jsonb(res->>'reason')),
      ',' order by c.ord)
   from (values
       (1, 'M1 1AE', null), (2, 'm11ae', null), (3, ' sw1a1aa ', null), (4, 'EC1A 1BB', null),
       (5, 'W1A 0AX', null), (6, 'EH1 1YZ', null), (7, 'CF10 1AA', null), (8, 'G1 1AA', null),
       (9, 'B1 1AA', null), (10, 'LS1 1AA', null), (11, 'N1 9GU', null), (12, 'AB10 1AB', null),
       (13, 'BT1 1AA', null), (14, 'bt48 6dq', null), (15, 'IM1 1AA', null), (16, 'JE2 3AB', null),
       (17, 'GY1 1AA', null), (18, 'BF1 4FB', null), (19, 'BX1 1LT', null), (20, 'GX11 1AA', null),
       (21, 'ASCN 1ZZ', null), (22, 'STHL 1ZZ', null), (23, 'BIQQ 1ZZ', null), (24, 'PO30 1AA', null),
       (25, 'PO41 0AA', null), (26, 'PO29 1AA', null), (27, 'PO42 1AA', null), (28, 'PO1 1AA', null),
       (29, 'TR21 0AA', null), (30, 'TR25 0AA', null), (31, 'TR20 8AA', null), (32, 'TR26 1AA', null),
       (33, 'HS1 2AA', null), (34, 'ZE1 0AA', null), (35, 'KA27 8AA', null), (36, 'KA28 0AA', null),
       (37, 'KA29 0AA', null), (38, 'KW15 1AA', null), (39, 'KW17 2AA', null), (40, 'KW14 7AA', null),
       (41, 'PH42 4RL', null), (42, 'PH44 4AA', null), (43, 'PH41 4AA', null), (44, 'PA20 0AA', null),
       (45, 'PA41 7AA', null), (46, 'PA49 7AA', null), (47, 'PA60 7AA', null), (48, 'PA78 6AA', null),
       (49, 'PA80 5AA', null), (50, 'PA21 2AA', null), (51, 'IV41 8AA', null), (52, 'IV49 9AA', null),
       (53, 'IV51 9AA', null), (54, 'IV55 8AA', null), (55, 'IV56 8AA', null), (56, 'IV50 0AA', null),
       (57, 'IV52 8AA', null), (58, 'IV40 8NG', null), (59, 'IV40 8PG', null), (60, 'IV40 8AA', null),
       (61, 'IV40 8AA', 'mainland'), (62, 'IV40 8AA', 'island'), (63, 'IV40 8NG', 'mainland'),
       (64, 'PA34 4AA', null), (65, 'PA34 4AA', 'island'), (66, 'PA34 4AA', 'mainland'),
       (67, 'INVALID', null), (68, '', null), (69, 'SW1', null), (70, '12345', null),
       (71, 'D02 X285', null), (72, 'BT', null), (73, 'L1 8JQ', null), (74, 'SW1A1AA', 'island')
     ) as c(ord, input, ev),
     lateral (select public.classify_postcode(c.input, c.ev) as res) x) as postcodes;
