-- Migration 037 disabled, but kept, a set of topic mappings when derived metric
-- definitions took over their work. For the identities a definition actually
-- produces, that leaves an unusable row: saving a topic mapping carrying a
-- reserved derived identity is rejected whether the mapping is enabled or not,
-- so reading the topic list and saving it back unchanged became impossible on
-- upgraded deployments. Remove those rows, the same way migration 036 removed
-- the mappings the Solar source adapter took over.
--
-- Only the identities a derived metric definition really produces belong here.
-- `totalPower` is deliberately absent: the definitions are keyed
-- `factoryCircuit.jungliTotalPower` and `factoryCircuit.guanyinTotalPower`, so
-- `cl:totalPower` and `kn:totalPower` are not reserved and still save
-- successfully. Their rows remain re-enableable through Data Hub, and deleting
-- them would destroy operator-configured topic, scale, offset, decimal places
-- and labels for no reason.
DELETE FROM topic_mappings
WHERE (
    metric_scope IN ('cl', 'kn')
    AND metric_key IN (
      'selfConsumptionRatio',
      'todayCo2Reduction',
      'totalCo2Reduction'
    )
  ) OR (
    metric_scope = 'global'
    AND metric_key IN ('todayGeneration', 'monthGeneration', 'totalGeneration')
  );
