<?php

namespace App\Models\Concerns;

trait UsesHumanRouteKey
{
    /** Use the public document number in URLs while keeping integer PKs and FKs internally. */
    public function getRouteKeyName(): string
    {
        return $this->humanRouteKey;
    }

    /** Accept old numeric URLs as well as the new human-readable route key. */
    public function resolveRouteBindingQuery($query, $value, $field = null)
    {
        if ($field !== null) {
            return parent::resolveRouteBindingQuery($query, $value, $field);
        }

        return ctype_digit((string) $value)
            ? $query->whereKey($value)
            : $query->where($this->getRouteKeyName(), $value);
    }
}
